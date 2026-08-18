import oportunidades from '../../src/data/oportunidades.json' with { type: 'json' };
import { rankOpportunities, isPromptInjection, sanitizeMessage } from '../../src/lib/radar-rank.js';
import {
	MODEL_ID,
	MAX_CANDIDATES_TO_AI,
	buildSystemPrompt,
	buildUserPrompt,
	candidateForModel,
	deterministicRecommendation,
	extractModelJson,
	validateModelRecommendations,
} from '../../src/lib/radar-assistant.js';

const MAX_MESSAGE_LENGTH = 800;
const AI_TIMEOUT_MS = 8_000;
const BASE_URL = '/';
const SOURCE_NOTE = 'La fuente oficial tiene siempre la última palabra sobre fechas y requisitos.';

const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
	status,
	headers: {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store',
		'x-content-type-options': 'nosniff',
	},
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const sha256 = async (value) => {
	const bytes = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const metric = (context, event) => {
	try {
		const analytics = context.env?.ANALYTICS;
		if (!analytics || typeof analytics.writeDataPoint !== 'function') return;
		const write = analytics.writeDataPoint({ blobs: [event], doubles: [1], indexes: ['asistente-radar'] });
		if (typeof context.waitUntil === 'function') context.waitUntil(Promise.resolve(write).catch(() => {}));
	} catch {
		// Las métricas son opcionales y nunca deben romper el asistente.
	}
};

const requestIp = (request) => request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

const consumeRateLimit = async (context) => {
	const namespace = context.env?.RATE_LIMITER;
	if (!namespace) return { allowed: false, unavailable: true };
	try {
		const salt = context.env.RATE_LIMIT_SALT || 'radar-estudiantil-rate-limit-v1';
		const identifier = await sha256(`${salt}:${requestIp(context.request)}`);
		const shard = namespace.idFromName(`radar-rate-limit:${identifier.slice(0, 2)}`);
		const stub = namespace.get(shard);
		const response = await stub.fetch('https://radar-rate-limit/consume', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ identifier, now: Date.now() }),
		});
		if (!response.ok) return { allowed: false, unavailable: true };
		const result = await response.json();
		return result?.allowed === true ? { allowed: true } : { allowed: false, reason: result?.reason || 'hourly' };
	} catch {
		return { allowed: false, unavailable: true };
	}
};

const deterministicRecommendations = (ranked) => ranked.results.slice(0, 5).map((result) => deterministicRecommendation(result, BASE_URL));

export const buildFallbackPayload = (ranked, message = 'La explicación con IA no está disponible temporalmente.') => ({
	mode: 'fallback',
	explanationAvailable: false,
	message,
	recommendations: deterministicRecommendations(ranked),
	sourceNote: SOURCE_NOTE,
});

const hasSearchSignal = (profile, message) => Boolean(
	message || profile.age || profile.level || profile.state || profile.interests?.length || profile.type || profile.free || profile.modality,
);

const readBody = async (request) => {
	if (request.method !== 'POST') return null;
	const contentType = request.headers.get('content-type') || '';
	if (!contentType.includes('application/json')) return null;
	try {
		const raw = await request.text();
		if (raw.length > 12_000) return null;
		const body = JSON.parse(raw);
		if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
		return body;
	} catch {
		return null;
	}
};

const runAi = async (context, profile, results) => {
	if (!context.env?.AI || typeof context.env.AI.run !== 'function') throw new Error('AI_BINDING_UNAVAILABLE');
	const candidates = results.slice(0, MAX_CANDIDATES_TO_AI).map(candidateForModel);
	const aiPromise = context.env.AI.run(MODEL_ID, {
		messages: [
			{ role: 'system', content: buildSystemPrompt() },
			{ role: 'user', content: buildUserPrompt(profile, candidates) },
		],
		max_tokens: 280,
		temperature: 0.2,
		top_p: 0.85,
	});
	const result = await Promise.race([aiPromise, wait(AI_TIMEOUT_MS).then(() => { throw new Error('AI_TIMEOUT'); })]);
	const payload = extractModelJson(result);
	const recommendations = validateModelRecommendations(payload, candidates);
	if (!payload || recommendations.length < Math.min(3, candidates.length)) throw new Error('AI_INVALID_RESPONSE');
	return {
		mode: 'ai',
		explanationAvailable: true,
		message: typeof payload.intro === 'string' && payload.intro.trim() ? payload.intro.trim().slice(0, 500) : 'Estas parecen las opciones más compatibles con tu búsqueda:',
		recommendations: recommendations.map((recommendation) => ({
			...recommendation,
			url: `${BASE_URL}oportunidades/${recommendation.slug}`,
		})),
		sourceNote: SOURCE_NOTE,
	};
};

export const onRequest = async (context) => {
	if (context.request.method === 'OPTIONS') return new Response(null, { status: 204 });
	if (context.request.method !== 'POST') return jsonResponse({ message: 'Método no permitido.' }, 405);
	const body = await readBody(context.request);
	if (!body) return jsonResponse({ message: 'La solicitud no tiene un formato válido.' }, 400);
	const message = sanitizeMessage(body.message, MAX_MESSAGE_LENGTH);
	const rawProfile = body.profile && typeof body.profile === 'object' && !Array.isArray(body.profile) ? body.profile : {};
	const ranked = rankOpportunities(oportunidades, { ...rawProfile, message }, { limit: MAX_CANDIDATES_TO_AI });
	if (!hasSearchSignal(ranked.profile, message)) {
		return jsonResponse({ mode: 'needs-profile', explanationAvailable: false, message: 'Cuéntame al menos tu nivel, edad, estado, intereses o el tipo de oportunidad que buscas.', recommendations: [], sourceNote: SOURCE_NOTE }, 400);
	}

	const rate = await consumeRateLimit(context);
	if (!rate.allowed && !rate.unavailable) {
		metric(context, 'rate_limited');
		return jsonResponse({
			...buildFallbackPayload(ranked, 'Alcanzaste el límite temporal del Asistente Radar. Estas son las mejores opciones encontradas por el catálogo; también puedes continuar con los filtros normales.'),
			mode: 'rate-limit',
		}, 429);
	}
	if (rate.unavailable) {
		metric(context, 'error');
		return jsonResponse(buildFallbackPayload(ranked, 'El Asistente Radar necesita terminar su configuración de seguridad. Mientras tanto, estas son las mejores oportunidades encontradas por el ranking de Radar.'));
	}

	if (isPromptInjection(message)) {
		metric(context, 'fallback');
		return jsonResponse(buildFallbackPayload(ranked, 'Puedo ayudarte únicamente a explorar oportunidades verificadas de Radar Estudiantil. Estas son las coincidencias encontradas.'));
	}

	if (!ranked.results.length) {
		metric(context, 'fallback');
		return jsonResponse(buildFallbackPayload(ranked, 'No encontré oportunidades verificadas compatibles con esos requisitos duros. Prueba relajando algún filtro o explora el catálogo completo.'));
	}

	try {
		const response = await runAi(context, ranked.profile, ranked.results);
		metric(context, 'ai_response');
		return jsonResponse(response);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		console.error('Asistente Radar AI fallback:', reason.slice(0, 160));
		metric(context, 'fallback');
		return jsonResponse(buildFallbackPayload(ranked));
	}
};
