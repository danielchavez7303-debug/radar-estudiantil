import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(projectRoot, 'src', 'data', 'oportunidades.json');
const errors = [];
const warnings = [];
const publishedStates = new Set(['activa', 'permanente', 'proxima', 'cerrada', 'finalizada', 'enProceso', 'resultados']);
const verificationStates = new Set(['verificada', 'pendiente', 'enRevision', 'rechazada', 'archivada']);
const multimediaTypes = new Set(['youtube']);
const multimediaSources = new Set(['oficial', 'comunidad']);

const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0 && value.every(isText);
const isTextArray = (value) => Array.isArray(value) && value.every((entry) => typeof entry === 'string');
const isNullableNumber = (value) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
const isIsoDate = (value) => {
	if (!isText(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const parsed = new Date(`${value}T12:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const isUrl = (value) => {
	if (!isText(value)) return false;
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:';
	} catch {
		return false;
	}
};
const isEmail = (value) => isText(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isPhone = (value) => isText(value) && /^[0-9+().\s-]{7,}$/.test(value);
const isYoutubeUrl = (value) => {
	if (!isUrl(value)) return false;
	try {
		const url = new URL(value);
		let videoId = '';
		if (url.hostname === 'youtu.be') videoId = url.pathname.slice(1);
		if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
			if (url.pathname === '/watch') videoId = url.searchParams.get('v') ?? '';
			if (url.pathname.startsWith('/shorts/')) videoId = url.pathname.split('/')[2] ?? '';
			if (url.pathname.startsWith('/embed/')) videoId = url.pathname.split('/')[2] ?? '';
		}
		return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
	} catch {
		return false;
	}
};
const addError = (slug, message) => errors.push(`[${slug}] ${message}`);
const addWarning = (slug, message) => warnings.push(`[${slug}] ${message}`);

let oportunidades;
try {
	oportunidades = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (error) {
	console.error(`No se pudo leer ${path.relative(projectRoot, dataPath)}.`);
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}

if (!Array.isArray(oportunidades)) {
	console.error('La raíz de oportunidades.json debe ser un arreglo.');
	process.exit(1);
}

const ids = new Set();
const slugs = new Set();
const editorialTemplateFields = [
	'id',
	'slug',
	'titulo',
	'categoria',
	'areas',
	'organizacion',
	'tipoInstitucion',
	'descripcion',
	'descripcionLarga',
	'estado',
	'fechaInicio',
	'fechaCierre',
	'cobertura',
	'modalidad',
	'estados',
	'niveles',
	'paraQuien',
	'requisitos',
	'costo',
	'contactoOficial',
	'correoOficial',
	'telefonoOficial',
	'enlaceConvocatoria',
	'sitioOficial',
	'multimedia',
	'beneficios',
	'comoParticipar',
	'documentos',
	'edadMinima',
	'edadMaxima',
	'requiereEscuela',
	'requiereTutor',
	'publicar',
	'estadoVerificacion',
	'ultimaVerificacion',
];
const textFields = ['id', 'slug', 'titulo', 'categoria', 'descripcion', 'descripcionLarga', 'organizacion', 'tipoInstitucion', 'cobertura', 'modalidad', 'paraQuien', 'costo', 'estado', 'estadoVerificacion'];
let publishedCount = 0;

oportunidades.forEach((item, index) => {
	const slug = isText(item?.slug) ? item.slug : `registro-${index + 1}`;
	const isPublished = item?.publicar === true;
	if (isPublished) publishedCount += 1;

	if (!isText(item?.id)) addError(slug, 'falta id.');
	if (!isText(item?.slug)) addError(slug, 'falta slug.');
	if (ids.has(item?.id)) addError(slug, 'id duplicado.');
	if (slugs.has(item?.slug)) addError(slug, 'slug duplicado.');
	if (isText(item?.id)) ids.add(item.id);
	if (isText(item?.slug)) slugs.add(item.slug);

	editorialTemplateFields.forEach((field) => {
		if (!Object.prototype.hasOwnProperty.call(item ?? {}, field)) addError(slug, `la plantilla no incluye el campo ${field}.`);
	});
	textFields.forEach((field) => {
		if (!isText(item?.[field])) addError(slug, `falta ${field}.`);
	});
	if (!isNonEmptyArray(item?.areas)) addError(slug, 'areas debe ser un arreglo de textos no vacío.');
	if (!isNonEmptyArray(item?.estados)) addError(slug, 'estados debe ser un arreglo de textos no vacío.');
	if (!isNonEmptyArray(item?.niveles)) addError(slug, 'niveles debe ser un arreglo de textos no vacío.');
	if (!isNonEmptyArray(item?.requisitos)) addError(slug, 'requisitos debe tener al menos un elemento.');
	['beneficios', 'comoParticipar', 'documentos'].forEach((field) => {
		if (!isTextArray(item?.[field])) addError(slug, `${field} debe ser un arreglo de textos, aunque esté vacío.`);
	});

	['fechaInicio', 'fechaCierre'].forEach((field) => {
		if (item?.[field] !== null && !isIsoDate(item?.[field])) addError(slug, `${field} debe ser una fecha ISO YYYY-MM-DD o null.`);
	});
	if (item?.fechaInicio && item?.fechaCierre && item.fechaInicio > item.fechaCierre) addError(slug, 'fechaInicio no puede ser posterior a fechaCierre.');
	if (item?.ultimaVerificacion !== null && !isIsoDate(item?.ultimaVerificacion)) addError(slug, 'ultimaVerificacion debe ser una fecha ISO YYYY-MM-DD o null.');
	if (item?.contactoOficial !== null && !isText(item?.contactoOficial)) addError(slug, 'contactoOficial debe ser un texto o null.');
	if (item?.publicar !== true && item?.publicar !== false) addError(slug, 'publicar debe ser booleano.');
	if (typeof item?.requiereEscuela !== 'boolean') addError(slug, 'requiereEscuela debe ser booleano.');
	if (typeof item?.requiereTutor !== 'boolean') addError(slug, 'requiereTutor debe ser booleano.');
	if (!isNullableNumber(item?.edadMinima)) addError(slug, 'edadMinima debe ser un número positivo o null.');
	if (!isNullableNumber(item?.edadMaxima)) addError(slug, 'edadMaxima debe ser un número positivo o null.');
	if (item?.edadMinima !== null && item?.edadMaxima !== null && item.edadMinima > item.edadMaxima) addError(slug, 'edadMinima no puede ser mayor que edadMaxima.');

	if (!verificationStates.has(item?.estadoVerificacion)) addError(slug, `estadoVerificacion no reconocido: ${item?.estadoVerificacion ?? 'vacío'}.`);

	const links = [
		['enlaceConvocatoria', item?.enlaceConvocatoria],
		['sitioOficial', item?.sitioOficial],
	];
	links.forEach(([field, value]) => {
		if (value !== null && !isUrl(value)) addError(slug, `${field} debe ser una URL http(s) válida o null.`);
	});
	if (item?.correoOficial !== null && !isEmail(item?.correoOficial)) addError(slug, 'correoOficial debe ser un correo válido o null.');
	if (item?.telefonoOficial !== null && !isPhone(item?.telefonoOficial)) addError(slug, 'telefonoOficial debe ser un teléfono válido o null.');
	if (item?.multimedia !== null) {
		const media = item?.multimedia;
		if (!media || typeof media !== 'object' || Array.isArray(media)) addError(slug, 'multimedia debe ser un objeto o null.');
		else {
			if (!multimediaTypes.has(media.tipo)) addError(slug, `multimedia.tipo no reconocido: ${media.tipo ?? 'vacío'}.`);
			if (!isYoutubeUrl(media.url)) addError(slug, 'multimedia.url debe ser un enlace válido de YouTube.');
			if (!isText(media.titulo)) addError(slug, 'multimedia.titulo debe ser un texto.');
			if (!multimediaSources.has(media.fuente)) addError(slug, `multimedia.fuente no reconocida: ${media.fuente ?? 'vacía'}.`);
		}
	}

	if (isPublished) {
		if (item.estadoVerificacion !== 'verificada') addError(slug, 'una ficha pública debe estar verificada.');
		if (!publishedStates.has(item.estado)) addError(slug, `estado público no reconocido: ${item.estado}.`);
		if (item.modalidad === 'Por confirmar') addError(slug, 'modalidad todavía está por confirmar.');
		if (!isIsoDate(item.ultimaVerificacion)) addError(slug, 'falta una ultimaVerificacion válida.');
		if (!isText(item.contactoOficial)) addError(slug, 'falta contactoOficial.');
		if (!isUrl(item.sitioOficial) && !isUrl(item.enlaceConvocatoria)) addError(slug, 'falta al menos una fuente oficial con URL válida.');
		if (item.estado !== 'permanente' && !item.fechaInicio && !item.fechaCierre) addError(slug, 'una oportunidad no permanente necesita fechaInicio o fechaCierre.');
	} else {
		const missingDraftFields = ['contactoOficial', 'sitioOficial', 'ultimaVerificacion'].filter((field) => !isText(item?.[field]));
		if (missingDraftFields.length > 0) addWarning(slug, `borrador pendiente de completar: ${missingDraftFields.join(', ')}.`);
	}
});

console.log(`Validación de oportunidades: ${publishedCount} públicas, ${oportunidades.length - publishedCount} borradores.`);
if (warnings.length > 0) {
	console.warn(`\nAvisos editoriales (${warnings.length}):`);
	warnings.forEach((warning) => console.warn(`- ${warning}`));
}
if (errors.length > 0) {
	console.error(`\nErrores que deben corregirse (${errors.length}):`);
	errors.forEach((error) => console.error(`- ${error}`));
	process.exitCode = 1;
} else {
	console.log('No hay errores de estructura ni de publicación.');
}
