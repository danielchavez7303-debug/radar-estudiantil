import { DurableObject } from "cloudflare:workers";

const TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS rate_limits (
    bucket_id TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )
`;

export class RadarRateLimit extends DurableObject {
	constructor(ctx, env) {
		super(ctx, env);
		this.ctx.storage.sql.exec(TABLE_SCHEMA);
	}

	consume(bucketId, now, limit, windowMs) {
		const row = this.ctx.storage.sql.exec(
			'SELECT count, expires_at FROM rate_limits WHERE bucket_id = ?',
			bucketId,
		).one();
		if (!row || Number(row.expires_at) <= now) {
			this.ctx.storage.sql.exec(
				'INSERT INTO rate_limits (bucket_id, count, expires_at) VALUES (?, ?, ?) ON CONFLICT(bucket_id) DO UPDATE SET count = excluded.count, expires_at = excluded.expires_at',
				bucketId,
				1,
				now + windowMs,
			);
			return { allowed: true, remaining: limit - 1 };
		}
		if (Number(row.count) >= limit) return { allowed: false, remaining: 0, expiresAt: Number(row.expires_at) };
		const nextCount = Number(row.count) + 1;
		this.ctx.storage.sql.exec('UPDATE rate_limits SET count = ? WHERE bucket_id = ?', nextCount, bucketId);
		return { allowed: true, remaining: Math.max(0, limit - nextCount) };
	}

	async fetch(request) {
		if (request.method !== 'POST') return new Response('Not found', { status: 404 });
		let payload;
		try {
			payload = await request.json();
		} catch {
			return Response.json({ allowed: false, reason: 'invalid' }, { status: 400 });
		}
		const identifier = String(payload?.identifier ?? '');
		const now = Number(payload?.now);
		if (!/^[a-f0-9]{64}$/.test(identifier) || !Number.isFinite(now)) {
			return Response.json({ allowed: false, reason: 'invalid' }, { status: 400 });
		}

		const burst = this.consume(`${identifier}:burst`, now, 3, 60_000);
		if (!burst.allowed) return Response.json({ allowed: false, reason: 'burst', retryAt: burst.expiresAt });
		const hourly = this.consume(`${identifier}:hour`, now, 10, 3_600_000);
		if (!hourly.allowed) return Response.json({ allowed: false, reason: 'hourly', retryAt: hourly.expiresAt });
		return Response.json({ allowed: true, remaining: hourly.remaining });
	}
}

export default {
	async fetch() {
		return new Response('Radar Estudiantil rate limit worker', { status: 200 });
	},
};
