import { detailActions, loadDetail } from '$lib/server/detail';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => loadDetail(event, 'job');
export const actions: Actions = detailActions;
