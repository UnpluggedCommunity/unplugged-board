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
	images?: { mimeType: string; base64: string }[];
	temperature?: number;
}

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const aiConfigured = () => Boolean(env.GEMINI_API_KEY);

export async function generateJson<T>(req: JsonRequest): Promise<AiResult<T>> {
	const key = env.GEMINI_API_KEY;
	if (!key) return { ok: false, reason: 'not_configured' };
	const model = env.GEMINI_MODEL || DEFAULT_MODEL;

	const parts: Record<string, unknown>[] = [{ text: req.prompt }];
	for (const img of req.images ?? []) {
		parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
	}

	let res: Response;
	try {
		res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
			body: JSON.stringify({
				system_instruction: { parts: [{ text: req.system }] },
				contents: [{ role: 'user', parts }],
				generationConfig: {
					responseMimeType: 'application/json',
					responseSchema: req.schema,
					temperature: req.temperature ?? 0.5
				}
			})
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
	} catch (e) {
		return { ok: false, reason: 'error', detail: 'Unreadable AI response' };
	}
}
