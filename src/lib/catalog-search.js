export const MEXICAN_STATE_NAMES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
  'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
  'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
  'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

const STOP_WORDS = new Set([
  'a', 'al', 'de', 'del', 'el', 'en', 'la', 'las', 'lo', 'los', 'para', 'por', 'que', 'un', 'una',
  'unos', 'unas', 'y', 'con', 'sin', 'busco', 'buscando', 'quiero', 'necesito', 'opciones',
  'oportunidad', 'oportunidades', 'estudiante', 'estudiantes',
]);

const QUERY_ALIASES = {
  becas: 'beca',
  beca: 'beca',
  universitarias: 'universidad',
  universitario: 'universidad',
  universitarios: 'universidad',
  uni: 'universidad',
  prepa: 'preparatoria',
  bachiller: 'bachillerato',
  gratis: 'gratuito',
  gratuita: 'gratuito',
  gratuitas: 'gratuito',
  free: 'gratuito',
  online: 'linea',
  virtual: 'linea',
  remoto: 'linea',
  descuentos: 'descuento',
  cursos: 'curso',
  talleres: 'taller',
  concursos: 'concurso',
  olimpiadas: 'olimpiada',
  programar: 'programacion',
  programacion: 'programacion',
  codigo: 'programacion',
};

const LEVEL_GROUPS = {
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

const STATUS_SCORES = {
  activa: 140,
  permanente: 105,
  proxima: 90,
  enProceso: 72,
  resultados: 8,
  cerrada: -100,
  finalizada: -120,
};

const CATEGORY_SCORES = {
  Becas: 35,
  'Beneficio estudiantil': 24,
  'Programa educativo': 18,
  Cursos: 16,
  'Recurso gratuito': 14,
  Competencias: 12,
};

const HIGH_REACH_TERMS = [
  'rita cetina',
  'benito juarez',
  'jovenes escribiendo el futuro',
  'beca universal',
  'becas jalisco contigo',
];

export const normalizeText = (value = '') => String(value)
  .toLocaleLowerCase('es-MX')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9$%\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const asList = (value) => Array.isArray(value)
  ? value.filter(Boolean)
  : value === null || value === undefined || value === ''
    ? []
    : [value];

const normalizedList = (value) => asList(value).map(normalizeText).filter(Boolean);

const matchesAlias = (value, aliases) => {
  const normalized = normalizeText(value);
  return aliases.some((alias) => normalized === normalizeText(alias) || normalized.includes(normalizeText(alias)));
};

export const levelFamily = (value) => {
  const normalized = normalizeText(value);
  for (const [family, aliases] of Object.entries(LEVEL_GROUPS)) {
    if (matchesAlias(normalized, aliases)) return family;
  }
  return normalized;
};

export const levelsOverlap = (wanted, available) => {
  const wantedFamily = levelFamily(wanted);
  const availableFamily = levelFamily(available);
  return wantedFamily === 'todos' || availableFamily === 'todos' || wantedFamily === availableFamily;
};

export const isNationalOpportunity = (item = {}) => {
  const coverage = normalizeText(item.cobertura ?? item.coverage ?? '');
  const locations = normalizedList(item.estados ?? item.states ?? item.ubicacion ?? item.locations);
  return coverage === 'mexico' || locations.includes('nacional');
};

export const isFreeCost = (value = '') => /(^|\b)(gratuito|gratis|sin costo|sin cuota|no requiere cuota|acceso educativo sin costo|gratuito, sujeto)/.test(normalizeText(value));

export const isPaidCost = (value = '') => {
  const normalized = normalizeText(value);
  if (!normalized || isFreeCost(normalized)) return false;
  return /\$\s?\d|mxn|us\$|pago|precio|tarifa|mensual|anual|checkout|compra/.test(normalized);
};

export const modalityKind = (value = '') => {
  const normalized = normalizeText(value);
  if (/en linea|autodirigida|remota|virtual|descargable|registro en linea|activacion en linea/.test(normalized)) return 'online';
  if (/hibrida|mixta|en linea y presencial|en linea e hibrida/.test(normalized)) return 'hibrida';
  if (/presencial|plantel|clase|audicion/.test(normalized)) return 'presencial';
  return 'unknown';
};

export const catalogFields = (item = {}) => {
  const areas = normalizedList(item.areas ?? item.area);
  const levels = normalizedList(item.niveles ?? item.nivel);
  const locations = normalizedList(item.estados ?? item.states ?? item.ubicacion ?? item.locations);
  const coverage = normalizeText(item.cobertura ?? item.coverage);
  const fields = {
    title: normalizedList(item.titulo ?? item.title),
    category: normalizedList(item.categoria ?? item.category ?? item.tipo),
    areas,
    levels,
    locations: [...new Set([...locations, coverage].filter(Boolean))],
    institution: normalizedList(item.tipoInstitucion ?? item.institution),
    organization: normalizedList(item.organizacion ?? item.organization),
    modality: normalizedList(item.modalidad ?? item.modality),
    cost: normalizedList(item.costo ?? item.cost),
    status: normalizedList(item.estado ?? item.status),
    description: normalizedList([item.descripcion, item.descripcionLarga, item.paraQuien, item.search].filter(Boolean).join(' ')),
    coverage: coverage ? [coverage] : [],
  };
  fields.all = Object.values(fields).flat().join(' ');
  return fields;
};

export const tokenizeQuery = (query = '') => {
  const normalized = normalizeText(query).replace(/\bonline\b/g, 'en linea');
  return [...new Set(normalized
    .split(' ')
    .map((token) => QUERY_ALIASES[token] ?? token)
    .filter((token) => token && !STOP_WORDS.has(token) && token.length > 1))];
};

const valueContainsToken = (values, token) => values.some((value) => value === token || value.startsWith(token) || value.includes(token));

export const matchesCatalogQuery = (item, query = '') => {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return true;
  const fields = catalogFields(item);
  return tokens.every((token) => valueContainsToken(fields.all.split(' '), token) || fields.all.includes(token));
};

const scoreField = (values, token) => {
  let best = 0;
  for (const value of values) {
    if (value === token) best = Math.max(best, 3);
    else if (value.startsWith(token)) best = Math.max(best, 2);
    else if (value.includes(token)) best = Math.max(best, 1);
  }
  return best;
};

const queryFieldWeights = [
  ['title', 130],
  ['category', 76],
  ['areas', 62],
  ['organization', 45],
  ['levels', 38],
  ['locations', 32],
  ['modality', 28],
  ['cost', 26],
  ['institution', 24],
  ['description', 12],
];

export const catalogRelevanceScore = (item, query = '') => {
  const baseScore = Number(item.baseScore ?? item.score ?? catalogRelevanceBase(item));
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return baseScore;
  const fields = catalogFields(item);
  const score = tokens.reduce((total, token) => {
    const best = queryFieldWeights.reduce((max, [field, weight]) => Math.max(max, scoreField(fields[field], token) * weight), 0);
    return total + best;
  }, 0);
  const phrase = normalizeText(query);
  const phraseBonus = phrase.length > 3 && fields.all.includes(phrase) ? 90 : 0;
  return baseScore + score + phraseBonus;
};

export const matchesCatalogFilters = (item, filters = {}) => {
  const fields = catalogFields(item);
  const query = filters.query ?? '';
  if (!matchesCatalogQuery(item, query)) return false;

  const selectedType = normalizeText(filters.type);
  if (selectedType && !fields.category.some((value) => value === selectedType)) return false;

  const selectedArea = normalizeText(filters.area);
  if (selectedArea && !fields.areas.some((value) => value === selectedArea)) return false;

  const selectedInstitution = normalizeText(filters.institution);
  if (selectedInstitution && !fields.institution.some((value) => value === selectedInstitution)) return false;

  const selectedLevel = normalizeText(filters.level);
  if (selectedLevel && !fields.levels.some((value) => levelsOverlap(selectedLevel, value))) return false;

  const selectedStatus = normalizeText(filters.status);
  if (selectedStatus === 'abiertas' && !['activa', 'proxima', 'permanente', 'enproceso'].includes(fields.status[0])) return false;
  if (selectedStatus && selectedStatus !== 'abiertas' && !fields.status.includes(selectedStatus)) return false;

  const selectedCost = normalizeText(filters.cost);
  if (selectedCost === 'gratis' && !fields.cost.some(isFreeCost)) return false;
  if (selectedCost === 'pago' && !fields.cost.some(isPaidCost)) return false;
  if (selectedCost && !['gratis', 'pago'].includes(selectedCost) && !fields.cost.includes(selectedCost)) return false;

  const selectedLocation = normalizeText(filters.location);
  if (selectedLocation === 'en linea' && modalityKind(fields.modality.join(' ')) !== 'online' && !fields.locations.includes('en linea')) return false;
  if (selectedLocation === 'nacional' && !isNationalOpportunity({ cobertura: fields.coverage[0], estados: fields.locations })) return false;
  if (selectedLocation && !['en linea', 'nacional'].includes(selectedLocation)) {
    const stateMatch = fields.locations.includes(selectedLocation);
    const nationalMatch = MEXICAN_STATE_NAMES.some((state) => normalizeText(state) === selectedLocation) && isNationalOpportunity({ estados: fields.locations });
    if (!stateMatch && !nationalMatch) return false;
  }

  if (filters.favoritesOnly && !filters.favorites?.has?.(item.slug ?? item.id ?? '')) return false;
  return true;
};

export const catalogRelevanceBase = (opportunity = {}) => {
  const text = catalogFields(opportunity).all;
  let score = STATUS_SCORES[opportunity.estado] ?? 0;
  score += CATEGORY_SCORES[opportunity.categoria] ?? 0;
  if (isNationalOpportunity(opportunity)) score += 28;
  if (modalityKind(opportunity.modalidad) === 'online') score += 10;
  if (isFreeCost(opportunity.costo)) score += 12;
  score += Math.min(asList(opportunity.niveles).length, 5) * 4;
  if (opportunity.edadMinima === null || opportunity.edadMinima === undefined) score += 2;
  if (opportunity.edadMaxima === null || opportunity.edadMaxima === undefined) score += 2;
  if (opportunity.requiereTutor) score -= 4;
  if (HIGH_REACH_TERMS.some((term) => text.includes(normalizeText(term)))) score += 95;
  return score;
};
