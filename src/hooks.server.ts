import { redirect, type Redirect, type RequestEvent, type ResolveOptions } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET } from "$env/static/private";

const rateLimitMap = new Map<string, { requestCount: number; lastRequestTime: number }>();
const GLOBAL_LIMIT = 100; // Maximum requests per IP.
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes window for GLOBAL_LIMIT reset.

type AccessTokenData = {
    id: string;
    role: string;
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

        const clientIP = event.getClientAddress() ?? "unknown";
        const currentTime = Date.now();

        // (a). Reset the client request record or update it.
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

        // (b). If the request count exceeds the global limit, return 429.
        if (record.requestCount > GLOBAL_LIMIT) {
            return new Response(JSON.stringify({
                success: false,
                message: `Too many requests. Try again in ${WINDOW_MS / 60000} minutes.`,
            }), { status: 429 });
        };

        // 2. ROUTE PROTECTION. /////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // (a). Authentication state.
        const authHeader = event.request.headers.get("authorization");
        const accessToken = authHeader?.split(' ')[1];
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
                event.locals.user = decoded as AccessTokenData;
            } catch (error) {
                // Do nothing, LOL!!
            };
        };

        // (b). Define protected routes.
        const loginProtectedRoutes = ["/user", "/api/user", "/api/auth/refresh-tokens", "/api/auth/sign-out"];
        const adminProtectedRoutes = ["/admin", "/api/admin"];
        const publicOnlyRoutes = ["/login", "/api/auth/send-login-otp", "/api/auth/sign-in"];

        // (c). Find protection type.
        const isLoginProtectedRoute = loginProtectedRoutes.some((r) => event.url.pathname.startsWith(r));
        const isAdminProtectedRoute = adminProtectedRoutes.some((r) => event.url.pathname.startsWith(r));
        const isPublicOnlyRoute = publicOnlyRoutes.some((r) => event.url.pathname.startsWith(r));

        // (d). Apply protection.
        if (isLoginProtectedRoute && !event.locals.user) {
            if (event.url.pathname.startsWith("/api")) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Only logged-in users allowed.",
                }), { status: 401 });
            } else {
                throw redirect(303, "/login");
            };
        };
        if (isAdminProtectedRoute && event.locals.user?.role !== "Admin") {
            if (event.url.pathname.startsWith("/api")) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Only admins allowed.",
                }), { status: 403 });
            } else {
                throw redirect(303, "/profile");
            };
        };
        if (isPublicOnlyRoute && event.locals.user) {
            if (event.url.pathname.startsWith("/api")) {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Only logged-out users allowed.",
                }), { status: 403 });
            };
        };

        return resolve(event);
    } catch (error) {
        // (a). Necessary for redirection to be successful.
        if ((error as Redirect).status === 303) {
            throw error;
        };

        // (b). General error handling.
        console.error("Error during global request handling:", error);
        return new Response(JSON.stringify({
            success: false,
            message: "Internal server error.",
        }), { status: 500 });
    };
};