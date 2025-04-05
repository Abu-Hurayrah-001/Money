import { type RequestEvent, type ResolveOptions } from "@sveltejs/kit";

const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();
const GLOBAL_LIMIT = 100; // Maximum requests per IP.
const WINDOWS_MS = 10 * 60 * 1000; // 10 minutes window.

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
    console.log(clientIP)
    const currentTime = Date.now();

    let record = rateLimitMap.get(clientIP);
    if (!record || currentTime - record.lastRequest > WINDOWS_MS) {
        record = {
            count: 1,
            lastRequest: currentTime,
        };
    } else {
        record.count++;
        record.lastRequest = currentTime;
    };
    rateLimitMap.set(clientIP, record);

    // If the request count exceeds the global limit, return 429.
    if (record.count > GLOBAL_LIMIT) {
        return new Response(JSON.stringify({
            success: false,
            message: "Too many requests. Try again later.",
        }), { status: 429 });
    };

    return resolve(event);
};