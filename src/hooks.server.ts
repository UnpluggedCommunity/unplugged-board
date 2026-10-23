import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerClient(
		env.PUBLIC_SUPABASE_URL ?? '',
		env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookies) =>
					cookies.forEach(({ name, value, options }) =>
						event.cookies.set(name, value, { ...options, path: '/' })
					)
			}
		}
	);
	event.locals.supabase = supabase;

	// Memoised per request: verified JWT claims + profile status.
	let mePromise: Promise<App.Me | null> | undefined;
	event.locals.getMe = () =>
		(mePromise ??= (async () => {
			const { data, error } = await supabase.auth.getClaims();
			if (error || !data?.claims?.sub) return null;
			const { data: rows } = await supabase.rpc('my_status');
			const status = rows?.[0];
			const role = (status?.role ?? 'member') as App.Me['role'];
			return {
				id: data.claims.sub,
				email: status?.email ?? (data.claims.email as string) ?? null,
				name: status?.display_name ?? null,
				role,
				isMember: Boolean(status?.is_member),
				isStaff: role === 'staff' || role === 'admin',
				isAdmin: role === 'admin'
			};
		})());

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};
