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

## Rutas

- `/`: portada con buscador rápido y oportunidades destacadas.
- `/oportunidades`: catálogo público con búsqueda, filtros y ordenamiento.
- `/oportunidades/[slug]`: ficha individual estática de cada oportunidad verificada.

## Datos y verificación

Las oportunidades viven en `src/data/oportunidades.json`, separadas de la interfaz. Cada ficha puede incluir descripción, áreas, niveles, ubicación, costo, estado, requisitos, beneficios, pasos, documentos, fechas, enlaces oficiales y datos de verificación.

Solo se generan páginas públicas cuando una ficha tiene:

```json
{
  "publicar": true,
  "estadoVerificacion": "verificada"
}
```

Los borradores permanecen en el archivo de datos, pero no se muestran ni generan rutas públicas.

## Principios de la primera versión

- Radar Estudiantil conecta con la fuente oficial; no organiza convocatorias ni recibe solicitudes.
- No hay cuentas, autenticación, backend, base de datos ni recopilación de datos personales.
- La búsqueda, los filtros y la comprobación de compatibilidad funcionan localmente en el navegador.
- Las fuentes oficiales tienen la última palabra y deben revisarse antes de participar.

