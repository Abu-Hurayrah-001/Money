type RateLimitOptions = {
    limit: number;
    windowsMs: number;
};

const memoryRateLimitStore = new Map<
    string, // For route.
    Map<string, { requestCount: number; lastRequestTime: number }>
>();

export function customRateLimit(
    routeKey: string,
    clientIP: string,
    opts: RateLimitOptions,
) {
    const currentTime = Date.now();
    if (!memoryRateLimitStore.has(routeKey)) {
        memoryRateLimitStore.set(routeKey, new Map());
    };

    // Reset the client request record or update it.
    const routeMap = memoryRateLimitStore.get(routeKey);
    let record = routeMap?.get(clientIP);
    if (!record || currentTime - record.lastRequestTime > opts.windowsMs) {
        record = {
            requestCount: 1,
            lastRequestTime: currentTime,
        };
    } else {
        record.requestCount++;
        record.lastRequestTime = currentTime;
    };
    routeMap?.set(clientIP, record);

    // If the request count exceeds the limit, tell that the client's request has been limited.
    if (record.requestCount > opts.limit) {
        return {
            limited: true,
            message: `Too many requests. Try again in ${opts.windowsMs / 60000} minutes.`,
        };
    };

    return { limited: false };
};