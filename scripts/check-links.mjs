import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(projectRoot, 'src', 'data', 'oportunidades.json');
const timeoutMs = 10000;
const warnings = [];
const failures = [];

const isHttpUrl = (value) => {
	if (typeof value !== 'string' || value.trim().length === 0) return false;
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
};

const collectUrls = (oportunidades) => {
	const links = new Map();
	oportunidades
		.filter((item) => item?.publicar === true && item?.estadoVerificacion === 'verificada')
		.forEach((item) => {
			const candidates = [
				['sitio oficial', item.sitioOficial],
				['enlace de convocatoria', item.enlaceConvocatoria],
				['multimedia', item.multimedia?.url],
			];
			candidates.forEach(([kind, url]) => {
				if (!isHttpUrl(url)) return;
				if (!links.has(url)) links.set(url, []);
				links.get(url).push(`${item.slug} · ${kind}`);
			});
		});
	return links;
};

const request = async (url, method) => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url, {
			method,
			redirect: 'follow',
			headers: { 'user-agent': 'Radar Estudiantil link checker' },
			signal: controller.signal,
		});
		return { status: response.status, finalUrl: response.url };
	} finally {
		clearTimeout(timer);
	}
};

const checkUrl = async (url) => {
	try {
		let result = await request(url, 'HEAD');
		if ([403, 405, 429].includes(result.status)) result = await request(url, 'GET');
		return result;
	} catch (headError) {
		try {
			return await request(url, 'GET');
		} catch (getError) {
			return { error: getError instanceof Error ? getError.message : String(headError) };
		}
	}
};

let oportunidades;
try {
	oportunidades = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (error) {
	console.error(`No se pudo leer ${path.relative(projectRoot, dataPath)}.`);
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}

const links = collectUrls(oportunidades);
console.log(`Comprobando ${links.size} enlaces de fichas públicas…`);

for (const [url, contexts] of links) {
	const result = await checkUrl(url);
	const context = contexts.join(', ');
	if (result.error) {
		warnings.push(`${url} · ${context} · ${result.error}`);
		console.warn(`⚠ ${url} — no se pudo comprobar (${result.error})`);
		continue;
	}
	if (result.status >= 200 && result.status < 400) {
		const redirectNote = result.finalUrl && result.finalUrl !== url ? ` → ${result.finalUrl}` : '';
		console.log(`✓ ${url} (${result.status})${redirectNote}`);
		continue;
	}
	if ([401, 403, 429].includes(result.status)) {
		warnings.push(`${url} · ${context} · HTTP ${result.status}`);
		console.warn(`⚠ ${url} — respondió HTTP ${result.status}; puede requerir permisos o limitar solicitudes.`);
		continue;
	}
	failures.push(`${url} · ${context} · HTTP ${result.status}`);
	console.error(`✗ ${url} — respondió HTTP ${result.status}`);
}

if (warnings.length > 0) {
	console.warn(`\nAvisos de enlaces (${warnings.length}):`);
	warnings.forEach((warning) => console.warn(`- ${warning}`));
}
if (failures.length > 0) {
	console.error(`\nEnlaces que requieren revisión (${failures.length}):`);
	failures.forEach((failure) => console.error(`- ${failure}`));
	process.exitCode = 1;
} else {
	console.log('\nNo se detectaron enlaces con errores HTTP.');
}
