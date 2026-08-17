import oportunidades from '../data/oportunidades.json';

const siteUrl = 'https://radarestudiantil.pages.dev';
const staticRoutes = ['/', '/oportunidades', '/recursos', '/acerca'];

export const GET = () => {
	const routes = [
		...staticRoutes,
		...oportunidades
			.filter((oportunidad) => oportunidad.publicar && oportunidad.estadoVerificacion === 'verificada')
			.map((oportunidad) => `/oportunidades/${oportunidad.slug}`),
	];
	const urls = routes.map((route) => `
  <url>
    <loc>${siteUrl}${route}</loc>
  </url>`).join('');
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' },
	});
};
