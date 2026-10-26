/**
 * AI provider adapter. Only this file knows about Gemini: swap the provider here.
 * Free tier (no billing account) — see README for limits and data-use terms.
 */
import { env } from '$env/dynamic/private';

export type AiResult<T> =
	| { ok: true; data: T }
	| { ok: false; reason: 'not_configured' | 'quota' | 'error'; detail?: string };

interface JsonRequest {
	system: string;
	prompt: string;
	/** OpenAPI-style schema (Gemini responseSchema). */
	schema: Record<string, unknown>;
	temperature?: number;
}

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const aiConfigured = () => Boolean(env.GEMINI_API_KEY);

/** Text-only request (small: built in memory). */
export function generateJson<T>(req: JsonRequest): Promise<AiResult<T>> {
	return generateJsonWithParts<T>(req, null);
}

/**
 * Request with extra content parts (images) that are ALREADY serialised as JSON by the
 * browser: `{"text":"Image 1"},{"inline_data":{…}},…` without brackets. The bytes are
 * passed through untouched, so the Worker does no per-byte work on large uploads
 * (Workers Free has a ~10 ms CPU budget per request).
 */
export async function generateJsonWithParts<T>(
	req: JsonRequest,
	extraParts: ArrayBuffer | null
): Promise<AiResult<T>> {
	const key = env.GEMINI_API_KEY;
	if (!key) return { ok: false, reason: 'not_configured' };
	const model = env.GEMINI_MODEL || DEFAULT_MODEL;

	const head =
		`{"system_instruction":{"parts":[{"text":${JSON.stringify(req.system)}}]},` +
		`"contents":[{"role":"user","parts":[{"text":${JSON.stringify(req.prompt)}}`;
	const tail =
		`]}],"generationConfig":{"responseMimeType":"application/json",` +
		`"responseSchema":${JSON.stringify(req.schema)},"temperature":${req.temperature ?? 0.5}}}`;
	const body = extraParts ? new Blob([head, ',', extraParts, tail]) : head + tail;

	let res: Response;
	try {
		// GEMINI_ENDPOINT: only for local tests against a fake server
		res = await fetch(`${env.GEMINI_ENDPOINT || ENDPOINT}/${model}:generateContent`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
			body
		});
	} catch (e) {
		return { ok: false, reason: 'error', detail: String(e) };
	}

	if (res.status === 429) return { ok: false, reason: 'quota' };
	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		console.error('gemini', res.status, detail.slice(0, 500));
		return { ok: false, reason: 'error', detail: `HTTP ${res.status}` };
	}

	try {
		const json = (await res.json()) as {
			candidates?: { content?: { parts?: { text?: string }[] } }[];
		};
		const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
		return { ok: true, data: JSON.parse(text) as T };
	} catch {
		return { ok: false, reason: 'error', detail: 'Unreadable AI response' };
	}
}
