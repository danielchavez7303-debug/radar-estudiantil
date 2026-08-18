export const MEXICAN_STATES = [
	'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
	'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
	'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
	'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
	'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

export const ASSISTANT_CRITERIA = [
	{ key: 'level', label: 'Nivel educativo' },
	{ key: 'age', label: 'Edad' },
	{ key: 'location', label: 'Ubicación' },
	{ key: 'interest', label: 'Intereses' },
	{ key: 'type', label: 'Tipo de oportunidad' },
	{ key: 'cost', label: 'Costo' },
	{ key: 'modality', label: 'Modalidad' },
];

const LEVEL_ALIASES = {
	preescolar: ['preescolar', 'kinder', 'jardin de ninos'],
	primaria: ['primaria'],
	secundaria: ['secundaria'],
	mediaSuperior: ['preparatoria', 'bachillerato', 'media superior'],
	superior: ['universidad', 'licenciatura', 'superior'],
	posgrado: ['posgrado', 'maestria', 'doctorado'],
	adultos: ['personas adultas', 'adultos'],
	principiantes: ['principiantes', 'principiante'],
	todos: ['todos los niveles', 'todos'],
};

const TYPE_ALIASES = {
	Becas: ['beca', 'becas', 'apoyo economico'],
	'Beneficio estudiantil': ['beneficio', 'descuento', 'beneficios'],
	Competencias: ['competencia', 'concurso', 'olimpiada', 'reto'],
	Cursos: ['curso', 'cursos', 'taller', 'capacitacion'],
	'Programa educativo': ['programa educativo', 'programa'],
	'Recurso gratuito': ['recurso', 'software', 'herramienta'],
};

const INTEREST_ALIASES = {
	Programación: ['programacion', 'codigo', 'codificacion', 'desarrollo web'],
	Matemáticas: ['matematicas', 'matematica', 'algebra', 'geometria'],
	Ciencia: ['ciencia', 'cientifico', 'fisica', 'quimica', 'biologia'],
	'Tecnología': ['tecnologia', 'computacion', 'informatica', 'software'],
	'Inteligencia artificial': ['inteligencia artificial', 'machine learning', 'aprendizaje automatico'],
	Robótica: ['robotica', 'robots'],
	Arte: ['arte', 'dibujo', 'pintura'],
	Música: ['musica', 'instrumento', 'canto'],
	Lectura: ['lectura', 'libros', 'literatura'],
	Escritura: ['escritura', 'cuento', 'ensayo', 'poesia'],
	Emprendimiento: ['emprendimiento', 'emprender', 'negocio'],
	Idiomas: ['idiomas', 'ingles', 'frances', 'lenguas'],
	'Videojuegos': ['videojuegos', 'videojuego', 'gaming'],
	Fotografía: ['fotografia', 'foto', 'video'],
	'Deporte': ['deporte', 'futbol', 'atletismo'],
	'Salud': ['salud', 'medicina', 'nutricion'],
	'Investigación': ['investigacion', 'investigar'],
	'Medio ambiente': ['medio ambiente', 'ambiental', 'sustentabilidad'],
};

const STATUS_SCORES = {
	activa: 24,
	permanente: 20,
	proxima: 12,
	enProceso: 10,
	resultados: -12,
	porVerificar: -30,
	cerrada: -50,
	finalizada: -55,
};

const HIGH_REACH_TERMS = [
	'rita cetina',
	'benito juarez',
	'jovenes escribiendo el futuro',
	'beca universal',
];

export const normalizeText = (value = '') => String(value)
	.toLocaleLowerCase('es-MX')
	.normalize('NFD')
	.replace(/[\u0300-\u036f]/g, '')
	.replace(/[^a-z0-9$%\s-]/g, ' ')
	.replace(/\s+/g, ' ')
	.trim();

const list = (value) => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

const matchesAlias = (value, aliases) => {
	const normalized = normalizeText(value);
	return aliases.some((alias) => normalized === normalizeText(alias) || normalized.includes(normalizeText(alias)));
};

const levelFamily = (value) => {
	const normalized = normalizeText(value);
	for (const [family, aliases] of Object.entries(LEVEL_ALIASES)) {
		if (matchesAlias(normalized, aliases)) return family;
	}
	return normalized;
};

const levelsMatch = (profileLevel, opportunityLevels) => {
	const profileFamily = levelFamily(profileLevel);
	return list(opportunityLevels).some((level) => {
		const opportunityFamily = levelFamily(level);
		return opportunityFamily === 'todos' || opportunityFamily === profileFamily ||
			(profileFamily === 'mediaSuperior' && opportunityFamily === 'mediaSuperior') ||
			(profileFamily === 'superior' && opportunityFamily === 'superior');
	});
};

const isNational = (opportunity) => normalizeText(opportunity.cobertura) === 'mexico' ||
	list(opportunity.estados).some((state) => normalizeText(state) === 'nacional');

const isClearlyFree = (cost = '') => {
	const normalized = normalizeText(cost);
	return /(^|\b)(gratuito|gratis|sin costo|sin cuota|no requiere cuota|tramite gratuito|acceso educativo sin costo|rutas de aprendizaje gratuitas)/.test(normalized);
};

const isClearlyPaid = (cost = '') => {
	const normalized = normalizeText(cost);
	if (isClearlyFree(normalized)) return false;
	return /\$\s?\d|mxn|us\$|pago|precio|tarifa|mensual|anual|checkout|compra|descuento de|descuentos de/.test(normalized);
};

const modalityMatches = (wanted, actual) => {
	const target = normalizeText(wanted);
	const value = normalizeText(actual);
	if (!target || !value || value === 'por confirmar') return false;
	if (target === 'online') return /en linea|autodirigida|descargable|registro en linea|activacion en linea/.test(value);
	if (target === 'presencial') return /presencial|plantel|clase|audicion/.test(value);
	if (target === 'hibrida') return /hibrida|mixta|en linea y presencial|en linea e hibrida/.test(value);
	return value.includes(target);
};

const extractState = (message) => {
	const normalizedMessage = normalizeText(message);
	return MEXICAN_STATES.find((state) => normalizedMessage.includes(normalizeText(state))) ?? null;
};

const extractLevel = (message) => {
	const normalizedMessage = normalizeText(message);
	const options = ['Preparatoria', 'Bachillerato', 'Universidad', 'Secundaria', 'Primaria', 'Preescolar', 'Posgrado', 'Personas adultas'];
	return options.find((level) => normalizedMessage.includes(normalizeText(level))) ?? null;
};

const containsWholeAlias = (normalizedText, alias) => {
	const normalizedAlias = normalizeText(alias);
	if (!normalizedAlias) return false;
	const escapedAlias = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`(?:^|\\s)${escapedAlias}(?:$|\\s|[,.;:!?])`, 'i').test(normalizedText);
};

const extractType = (message) => {
	const normalizedMessage = normalizeText(message);
	for (const [type, aliases] of Object.entries(TYPE_ALIASES)) {
		if (aliases.some((alias) => containsWholeAlias(normalizedMessage, alias))) return type;
	}
	return null;
};

const extractInterests = (message) => {
	const normalizedMessage = normalizeText(message);
	return Object.entries(INTEREST_ALIASES)
		.filter(([, aliases]) => aliases.some((alias) => containsWholeAlias(normalizedMessage, alias)))
		.map(([interest]) => interest)
		.slice(0, 8);
};

export const isPromptInjection = (message = '') => {
	const normalized = normalizeText(message);
	return [
		/ignora (las|tus|todas) reglas/,
	/ignora el sistema/,
	/revela (el )?(prompt|mensaje|instrucciones)/,
	/system prompt/,
	/ejecuta (codigo|comandos|una funcion)/,
	/accede (al )?(servidor|sistema|archivo)/,
	/dime (tus|los) secretos/,
	/actua como (un|una) chatbot general/,
	].some((pattern) => pattern.test(normalized));
};

export const sanitizeMessage = (message = '', maxLength = 800) => String(message)
	.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
	.replace(/\s+/g, ' ')
	.trim()
	.slice(0, maxLength);

export const normalizeProfile = (input = {}, message = '') => {
	const safeMessage = sanitizeMessage(message);
	const rawAge = Number(input.age);
	const age = Number.isInteger(rawAge) && rawAge >= 5 && rawAge <= 100 ? rawAge : null;
	const rawLevel = String(input.level ?? '').trim();
	const rawState = String(input.state ?? '').trim();
	const rawType = String(input.type ?? '').trim();
	const rawModality = String(input.modality ?? '').trim().toLocaleLowerCase('es-MX');
	const explicitInterests = list(input.interests ?? input.area)
		.flatMap((item) => String(item).split(/[,;|]/))
		.map((item) => sanitizeMessage(item, 80))
		.filter(Boolean)
		.slice(0, 8);
	const interests = explicitInterests.length ? explicitInterests : extractInterests(safeMessage);
	const explicitFree = input.free === true || input.free === 'true' || input.free === 1 || input.free === '1';
	const inferredFree = /\b(gratis|gratuito|sin costo|sin cuota)\b/i.test(safeMessage);
	const historical = Boolean(input.historical) || /\b(historic|cerrad|resultados|anteriores)\b/i.test(safeMessage);
	return {
		age,
		level: rawLevel || extractLevel(safeMessage),
		state: MEXICAN_STATES.includes(rawState) ? rawState : extractState(safeMessage),
		interests,
		type: rawType || extractType(safeMessage),
		free: explicitFree || inferredFree,
		modality: ['online', 'presencial', 'hibrida'].includes(rawModality) ? rawModality : null,
		historical,
		message: safeMessage,
	};
};

const addCriterion = (criteria, key, status, points = 0) => {
	const criterion = ASSISTANT_CRITERIA.find((item) => item.key === key);
	if (!criterion) return;
	criteria.push({ key, label: criterion.label, status, points });
};

const opportunitySearchText = (opportunity) => normalizeText([
	opportunity.titulo,
	opportunity.descripcion,
	opportunity.paraQuien,
	opportunity.organizacion,
	...list(opportunity.areas),
	...list(opportunity.niveles),
].join(' '));

const hardCompatibility = (opportunity, profile) => {
	const reasons = [];
	if (profile.level && !levelsMatch(profile.level, opportunity.niveles)) reasons.push('nivel educativo incompatible');
	const minimumAge = opportunity.edadMinima === null || opportunity.edadMinima === undefined || opportunity.edadMinima === '' ? null : Number(opportunity.edadMinima);
	const maximumAge = opportunity.edadMaxima === null || opportunity.edadMaxima === undefined || opportunity.edadMaxima === '' ? null : Number(opportunity.edadMaxima);
	if (profile.age !== null && ((Number.isFinite(minimumAge) && profile.age < minimumAge) || (Number.isFinite(maximumAge) && profile.age > maximumAge))) {
		reasons.push('edad fuera del rango');
	}
	if (profile.state && !isNational(opportunity) && !list(opportunity.estados).some((state) => normalizeText(state) === normalizeText(profile.state))) {
		reasons.push('ubicación incompatible');
	}
	if (!profile.historical && ['cerrada', 'finalizada', 'resultados'].includes(opportunity.estado)) reasons.push('convocatoria cerrada');
	if (profile.free && isClearlyPaid(opportunity.costo)) reasons.push('costo no compatible con una búsqueda gratuita');
	return reasons;
};

export const scoreOpportunity = (opportunity, profile) => {
	const criteria = [];
	let score = STATUS_SCORES[opportunity.estado] ?? 0;
	const text = opportunitySearchText(opportunity);

	if (!profile.level) addCriterion(criteria, 'level', 'unknown');
	else if (levelsMatch(profile.level, opportunity.niveles)) { score += 30; addCriterion(criteria, 'level', 'match', 30); }
	else addCriterion(criteria, 'level', 'mismatch');

	if (profile.age === null) addCriterion(criteria, 'age', 'unknown');
	else if (!opportunity.edadMinima && !opportunity.edadMaxima) { score += 8; addCriterion(criteria, 'age', 'unknown'); }
	else { score += 25; addCriterion(criteria, 'age', 'match', 25); }

	if (!profile.state) addCriterion(criteria, 'location', 'unknown');
	else if (isNational(opportunity) || list(opportunity.estados).some((state) => normalizeText(state) === normalizeText(profile.state))) { score += isNational(opportunity) ? 15 : 25; addCriterion(criteria, 'location', 'match', isNational(opportunity) ? 15 : 25); }
	else addCriterion(criteria, 'location', 'mismatch');

	if (!profile.interests.length) addCriterion(criteria, 'interest', 'unknown');
	else {
		const hits = profile.interests.filter((interest) => text.includes(normalizeText(interest)));
		if (hits.length) { score += Math.min(24, 15 + hits.length * 4); addCriterion(criteria, 'interest', 'match', 15); }
		else addCriterion(criteria, 'interest', 'mismatch');
	}

	if (!profile.type) addCriterion(criteria, 'type', 'unknown');
	else if (opportunity.categoria === profile.type || normalizeText(opportunity.categoria).includes(normalizeText(profile.type))) { score += 15; addCriterion(criteria, 'type', 'match', 15); }
	else addCriterion(criteria, 'type', 'mismatch');

	if (!profile.free) addCriterion(criteria, 'cost', 'unknown');
	else if (isClearlyFree(opportunity.costo)) { score += 12; addCriterion(criteria, 'cost', 'match', 12); }
	else if (isClearlyPaid(opportunity.costo)) addCriterion(criteria, 'cost', 'mismatch');
	else addCriterion(criteria, 'cost', 'unknown');

	if (!profile.modality) addCriterion(criteria, 'modality', 'unknown');
	else if (modalityMatches(profile.modality, opportunity.modalidad)) { score += 8; addCriterion(criteria, 'modality', 'match', 8); }
	else addCriterion(criteria, 'modality', 'mismatch');

	if (HIGH_REACH_TERMS.some((term) => text.includes(normalizeText(term)))) score += 20;
	if (opportunity.cobertura === 'México') score += 4;

	const matchedCriteria = criteria.filter((item) => item.status === 'match').map((item) => item.label);
	const mismatchedCriteria = criteria.filter((item) => item.status === 'mismatch').map((item) => item.label);
	const unknownCriteria = criteria.filter((item) => item.status === 'unknown').map((item) => item.label);
	const warnings = [];
	if (['proxima', 'resultados'].includes(opportunity.estado)) warnings.push('Revisa las fechas y el estado actual en la fuente oficial.');
	if (opportunity.requiereEscuela) warnings.push('La ficha indica que puede requerir participación de una escuela.');
	if (opportunity.requiereTutor) warnings.push('La ficha indica que puede requerir tutoría o autorización.');
	if (profile.historical && ['cerrada', 'finalizada', 'resultados'].includes(opportunity.estado)) warnings.push('Esta convocatoria está cerrada; se muestra por tu búsqueda histórica.');
	return {
		opportunity,
		score,
		criteria,
		matchedCriteria,
		mismatchedCriteria,
		unknownCriteria,
		warnings,
		hardReasons: [],
	};
};

export const rankOpportunities = (opportunities, rawProfile = {}, options = {}) => {
	const profile = normalizeProfile(rawProfile, rawProfile.message ?? '');
	const limit = Math.min(8, Math.max(5, Number(options.limit) || 8));
	const verified = list(opportunities).filter((opportunity) => opportunity && opportunity.publicar === true && opportunity.estadoVerificacion === 'verificada');
	const eligible = [];
	let hardDiscardedCount = 0;
	for (const opportunity of verified) {
		const reasons = hardCompatibility(opportunity, profile);
		if (reasons.length) { hardDiscardedCount += 1; continue; }
		eligible.push(scoreOpportunity(opportunity, profile));
	}
	eligible.sort((a, b) => b.score - a.score || String(a.opportunity.titulo).localeCompare(String(b.opportunity.titulo), 'es-MX'));
	return {
		profile,
		consideredCount: verified.length,
		hardDiscardedCount,
		totalEligible: eligible.length,
		results: eligible.slice(0, limit),
	};
};

export const summarizeMatch = (result) => {
	const total = result.matchedCriteria.length + result.mismatchedCriteria.length + result.unknownCriteria.length;
	if (!total) return 'No hay suficientes datos para comparar criterios.';
	return `Coincide en ${result.matchedCriteria.length} de ${total} criterios relevantes.`;
};

export const hardCompatibilityForTest = hardCompatibility;

