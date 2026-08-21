import assert from 'node:assert/strict';
import {
  catalogRelevanceBase,
  catalogRelevanceScore,
  ageMatchesOpportunity,
  isCurrentlyOpen,
  isFreeCost,
  levelsOverlap,
  matchesCatalogFilters,
  matchesCatalogQuery,
} from '../src/lib/catalog-search.js';

const nationalScholarship = {
  slug: 'beca-programacion',
  titulo: 'Beca nacional de programación',
  categoria: 'Becas',
  areas: ['Programación', 'Tecnología'],
  organizacion: 'Red Estudiantil',
  niveles: ['Bachillerato', 'Universidad'],
  estados: ['Nacional'],
  cobertura: 'México',
  modalidad: 'En línea',
  costo: 'Gratuito',
  estado: 'activa',
  publicar: true,
  estadoVerificacion: 'verificada',
};

const localCourse = {
  slug: 'curso-cerrado',
  titulo: 'Curso presencial de matemáticas',
  categoria: 'Cursos',
  areas: ['Matemáticas'],
  organizacion: 'Centro local',
  niveles: ['Bachillerato'],
  estados: ['Jalisco'],
  cobertura: 'Jalisco',
  modalidad: 'Presencial',
  costo: '$500 MXN',
  estado: 'cerrada',
  publicar: true,
  estadoVerificacion: 'verificada',
};

assert.equal(levelsOverlap('Preparatoria', 'Bachillerato'), true);
assert.equal(levelsOverlap('Universidad', 'Bachillerato'), false);
assert.equal(isFreeCost('Gratuito, sujeto a validación estudiantil'), true);
assert.equal(matchesCatalogQuery(nationalScholarship, 'becas universitarias'), true);
assert.equal(matchesCatalogQuery(nationalScholarship, 'programación en línea'), true);
assert.equal(matchesCatalogQuery(nationalScholarship, 'arte'), false);

assert.equal(matchesCatalogFilters(nationalScholarship, { level: 'Preparatoria', location: 'Jalisco', cost: 'gratis', status: 'abiertas' }), true);
assert.equal(matchesCatalogFilters(localCourse, { level: 'Preparatoria', location: 'Jalisco', status: 'abiertas' }), false);
assert.equal(matchesCatalogFilters(localCourse, { location: 'Jalisco', status: 'cerrada', cost: 'pago' }), true);
assert.equal(matchesCatalogFilters(nationalScholarship, { location: 'En línea' }), true);
assert.equal(matchesCatalogFilters(nationalScholarship, { modality: 'En línea' }), true);
assert.equal(matchesCatalogFilters(localCourse, { modality: 'En línea' }), false);
assert.equal(matchesCatalogFilters({ ...nationalScholarship, modalidad: 'En línea e híbrida' }, { modality: 'Híbrida' }), true);
assert.equal(matchesCatalogFilters({ ...nationalScholarship, modalidad: 'En línea autodirigida' }, { modality: 'Autodirigida' }), true);
assert.equal(matchesCatalogFilters({ ...nationalScholarship, modalidad: 'En línea autodirigida' }, { modality: 'En línea' }), true);
assert.equal(isCurrentlyOpen({ estado: 'activa', fechaCierre: '2099-01-01' }, new Date('2026-08-21T12:00:00')), true);
assert.equal(isCurrentlyOpen({ estado: 'proxima', fechaInicio: '2099-01-01' }, new Date('2026-08-21T12:00:00')), false);
assert.equal(ageMatchesOpportunity({ edadMinima: 15, edadMaxima: 18 }, 16), true);
assert.equal(ageMatchesOpportunity({ edadMinima: 15, edadMaxima: 18 }, 20), false);
assert.equal(ageMatchesOpportunity({ edadMinima: null, edadMaxima: null }, 16), true);
assert.equal(matchesCatalogFilters({ ...nationalScholarship, edadMinima: 15, edadMaxima: 18 }, { age: '16' }), true);
assert.equal(matchesCatalogFilters({ ...nationalScholarship, edadMinima: 15, edadMaxima: 18 }, { age: '20' }), false);
assert.equal(matchesCatalogFilters(nationalScholarship, { location: 'Sonora' }), true);
assert.equal(matchesCatalogFilters(localCourse, { location: 'Sonora' }), false);

assert.ok(catalogRelevanceBase(nationalScholarship) > catalogRelevanceBase(localCourse));
assert.ok(catalogRelevanceScore(nationalScholarship, 'programación') > catalogRelevanceScore(localCourse, 'programación'));

console.log('Catálogo: filtros semánticos, ubicación nacional, niveles equivalentes y relevancia correctos.');
