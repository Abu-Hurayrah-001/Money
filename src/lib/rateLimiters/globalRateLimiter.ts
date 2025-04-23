import type { RequestEvent } from "@sveltejs/kit";

const rateLimitMap = new Map<string, { requestCount: number; lastRequestTime: number }>();
const GLOBAL_LIMIT = 100;
const WINDOW_MS = 10 * 60 * 1000;


export default function globalRateLimiter(event: RequestEvent): Response | null {
    const clientIP = event.getClientAddress() ?? "unknown";
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

    return null;
}