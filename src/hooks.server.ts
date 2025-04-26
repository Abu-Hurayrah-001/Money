import { json, type Redirect, type RequestEvent, type ResolveOptions } from "@sveltejs/kit";
import globalRateLimiter from "$lib/server/rateLimiters/globalRateLimiter";
import routeProtector from "$lib/server/routeProtector";

export async function handle({
    event,
    resolve,
}: {
    event: RequestEvent;
    resolve: (
        event: RequestEvent,
        opts?: ResolveOptions,
    ) => Promise<Response> 
}): Promise<Response> {
    try {
        // Global rate limiting.
        const globalRateLimiterResponse = globalRateLimiter(event);
        if (globalRateLimiterResponse) return globalRateLimiterResponse;
        
        // Route protection.
        const routeProtectorResponse = routeProtector(event);
        if (routeProtectorResponse) return routeProtectorResponse;

        return resolve(event);
    } catch (error) {
        // Necessary for redirection to be successful.
        if ((error as Redirect).status === 303) {
            throw error;
        };

        // General error handling.
        console.error("Error during global request handling:", error);
        return json({
            success: false,
            message: "Internal server error.",
        }, { status: 500 });
    };
};