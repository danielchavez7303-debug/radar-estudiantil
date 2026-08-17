# Radar Estudiantil

Plataforma estática y gratuita para ayudar a estudiantes de México a descubrir becas, competencias, cursos, programas, beneficios y recursos educativos.

## Desarrollo local

Desde esta carpeta:

```sh
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:4321`.

## Publicación

El sitio se publica en Cloudflare Pages mediante la integración con GitHub:

`https://radarestudiantil.pages.dev`

Cada cambio enviado a la rama principal vuelve a compilar y publicar la versión estática.

El sitio genera automáticamente `sitemap.xml`, `robots.txt`, etiquetas para compartir en redes y datos estructurados para las fichas públicas.

## Rutas

- `/`: portada con buscador rápido y oportunidades destacadas.
- `/oportunidades`: catálogo público con búsqueda, filtros y ordenamiento.
- `/oportunidades/[slug]`: ficha individual estática de cada oportunidad verificada.

## Datos y verificación

Las oportunidades viven en `src/data/oportunidades.json`, separadas de la interfaz. Cada ficha usa una plantilla editorial común con descripción, áreas, niveles, ubicación, tipo de institución, modalidad, costo, estado, requisitos, beneficios, pasos, documentos, fechas, enlaces oficiales, contacto, multimedia y datos de verificación.

Todas las fichas deben conservar las claves de la plantilla, aunque un borrador puede dejar pendientes como `null`. Una ficha pública debe completar como mínimo:

- Fuente oficial: `sitioOficial` o `enlaceConvocatoria`.
- Tipo de institución: `tipoInstitucion` (por ejemplo, Gobierno, Fundación, Empresa tecnológica o Sociedad científica).
- Fecha de revisión: `ultimaVerificacion` con formato `YYYY-MM-DD`.
- Estado y estado editorial: `estado` y `estadoVerificacion`.
- Requisitos: `requisitos` con al menos un elemento.
- Costo: `costo`.
- Modalidad: `modalidad`.
- Público: `paraQuien` y `niveles`.
- Contacto: `contactoOficial` y, cuando exista, correo o teléfono.
- Multimedia opcional: `multimedia` como `null` o un objeto con `tipo`, `url`, `titulo` y `fuente`.

Por ahora `multimedia.tipo` admite YouTube y `multimedia.fuente` puede ser `oficial` o `comunidad`. Los recursos externos siempre llevan un aviso para confirmar la información en la fuente oficial. Las oportunidades permanentes pueden dejar `fechaInicio` y `fechaCierre` en `null`; los demás estados necesitan al menos una fecha importante.

Solo se generan páginas públicas cuando una ficha tiene:

```json
{
  "publicar": true,
  "estadoVerificacion": "verificada"
}
```

Los borradores permanecen en el archivo de datos, pero no se muestran ni generan rutas públicas.

Antes de publicar cambios, revisa la estructura de las fichas con:

```sh
npm run validate:data
```

Para comprobar que las URLs oficiales y los recursos multimedia siguen respondiendo:

```sh
npm run validate:links
```

También puedes ejecutar ambas revisiones juntas:

```sh
npm run validate:all
```

`npm run validate:all` se ejecuta automáticamente antes de `npm run build`, por lo que una ficha con campos inválidos o enlaces que responden con errores HTTP no puede llegar a publicación. Una caída temporal de red se informa como aviso para no bloquear una compilación estática por un problema momentáneo.

## Principios de la primera versión

- Radar Estudiantil conecta con la fuente oficial; no organiza convocatorias ni recibe solicitudes.
- No hay cuentas, autenticación, backend, base de datos ni recopilación de datos personales.
- La búsqueda, los filtros y la comprobación de compatibilidad funcionan localmente en el navegador.
- Los favoritos y preferencias de exploración opcionales se guardan únicamente en el dispositivo mediante almacenamiento local; no se envían a un servidor.
- Las fuentes oficiales tienen la última palabra y deben revisarse antes de participar.
- Cada ficha pública incluye un enlace para reportar información desactualizada mediante el repositorio del proyecto.
