import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Me {
			id: string;
			email: string | null;
			name: string | null;
			role: 'member' | 'staff' | 'admin';
			isMember: boolean;
			isStaff: boolean;
			isAdmin: boolean;
		}
		interface Locals {
			supabase: SupabaseClient;
			getMe: () => Promise<Me | null>;
		}
		interface PageData {
			me: Me | null;
		}
		interface Platform {
			env: Record<string, unknown>;
			ctx: { waitUntil(promise: Promise<unknown>): void };
		}
	}
}

export {};
