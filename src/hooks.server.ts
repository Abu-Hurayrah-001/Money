import { type RequestEvent, type ResolveOptions } from "@sveltejs/kit";

const rateLimitMap = new Map<string, { requestCount: number; lastRequestTime: number }>();
const GLOBAL_LIMIT = 100; // Maximum requests per IP.
const WINDOWS_MS = 10 * 60 * 1000; // 10 minutes window for GLOBAL_LIMIT reset.

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
    const clientIP = event.getClientAddress();
    const currentTime = Date.now();

    // Reset the client request record or update it.
    let record = rateLimitMap.get(clientIP);
    if (!record || currentTime - record.lastRequestTime > WINDOWS_MS) {
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
            message: `Too many requests. Try again in ${WINDOWS_MS / 60000} minutes.`,
        }), { status: 429 });
    };
    
    return resolve(event);
};