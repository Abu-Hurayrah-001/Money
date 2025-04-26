import { type AccessTokenData } from "$lib/server/types/auth";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: AccessTokenData | null;
		};
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	};
};

export {};
