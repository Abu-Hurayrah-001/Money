type AccessTokenData = {
    id: string;
    role: string;
};

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
