import { type RequestEvent, type ResolveOptions } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET } from "$env/static/private";

const rateLimitMap = new Map<string, { requestCount: number; lastRequestTime: number }>();
const GLOBAL_LIMIT = 100; // Maximum requests per IP.
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes window for GLOBAL_LIMIT reset.

type AccessTokenData = {
    id: string;
};

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
        // 1. GLOBAL RATE LIMITING. ////////////////////////////////////////////////////////////////////////////////////////////////////////

        const clientIP = event.getClientAddress();
        const currentTime = Date.now();

        // Reset the client request record or update it.
        let record = rateLimitMap.get(clientIP);
        if (!record || currentTime - record.lastRequestTime > WINDOW_MS) {
            record = {
                requestCount: 1,
                lastRequestTime: currentTime,
            };
        } else {
            record.requestCount++;
            record.lastRequestTime = currentTime;
        };
        rateLimitMap.set(clientIP, record);

        // If the request count exceeds the global limit, return 429.
        if (record.requestCount > GLOBAL_LIMIT) {
            return new Response(JSON.stringify({
                success: false,
                message: `Too many requests. Try again in ${WINDOW_MS / 60000} minutes.`,
            }), { status: 429 });
        };

        // 2. ROUTE PROTECTION. /////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Authentication state.
        const authHeader = event.request.headers.get("authorization");
        const accessToken = authHeader?.split(' ')[1];
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
                event.locals.userId = (decoded as AccessTokenData).id;
            } catch (error) {
                
            }
        };

        return resolve(event);
    } catch (error) {
        console.error("Error during global request handling:", error);
        return new Response(JSON.stringify({
            success: false,
            message: "Internal server error.",
        }), { status: 500 });
    };
};