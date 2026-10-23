import { redirect } from '@sveltejs/kit';

// The homepage arrives in Phase 3 — for now the board starts on Jobs.
export const load = () => redirect(307, '/jobs');
