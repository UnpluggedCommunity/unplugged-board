/** Only allow same-site relative redirects ("/jobs", not "//evil.com"). */
export function safeNext(value: string | null | undefined, fallback = '/jobs') {
	return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}
