/** Build an RFC 822 email with one attachment — in the browser (no Worker CPU budget involved). */

const utf8 = (s: string) => new TextEncoder().encode(s);

function bytesToBase64(bytes: Uint8Array) {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}

const wrap = (b64: string) => b64.replace(/.{1,76}/g, '$&\r\n').trimEnd();
const header = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${bytesToBase64(utf8(s))}?=`);
const asciiName = (s: string) => s.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '').trim() || 'CV';

export function buildMime(msg: {
	to: string;
	subject: string;
	text: string;
	attachment?: { name: string; mimeType: string; bytes: Uint8Array };
}): Blob {
	const boundary = `unplugged_${crypto.randomUUID()}`;
	const parts = [
		`To: ${msg.to}`,
		`Subject: ${header(msg.subject)}`,
		'MIME-Version: 1.0',
		`Content-Type: multipart/mixed; boundary="${boundary}"`,
		'',
		`--${boundary}`,
		'Content-Type: text/plain; charset="UTF-8"',
		'Content-Transfer-Encoding: base64',
		'',
		wrap(bytesToBase64(utf8(msg.text)))
	];
	if (msg.attachment) {
		const name = asciiName(msg.attachment.name);
		parts.push(
			`--${boundary}`,
			`Content-Type: ${msg.attachment.mimeType}; name="${name}"`,
			`Content-Disposition: attachment; filename="${name}"`,
			'Content-Transfer-Encoding: base64',
			'',
			wrap(bytesToBase64(msg.attachment.bytes))
		);
	}
	parts.push(`--${boundary}--`, '');
	return new Blob([parts.join('\r\n')], { type: 'message/rfc822' });
}

/** Small UTF-8 text → base64url, to pass the message body for "My applications" in a header. */
export const textToBase64Url = (s: string) =>
	bytesToBase64(utf8(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
