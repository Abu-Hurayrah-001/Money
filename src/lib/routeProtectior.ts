import { redirect, type RequestEvent } from "@sveltejs/kit";
import type { AccessTokenData } from "./types/auth";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET } from "$env/static/private";

export default function routeProtector(event: RequestEvent): Response | null {
    // Authentication state.
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

    // Define protected routes.
    const loginProtectedRoutes = ["/user", "/api/user", "/api/auth/refresh-tokens", "/api/auth/sign-out"];
    const adminProtectedRoutes = ["/admin", "/api/admin"];
    const publicOnlyRoutes = ["/login", "/api/auth/send-login-otp", "/api/auth/sign-in"];

    // Find protection type.
    const isLoginProtectedRoute = loginProtectedRoutes.some((r) => event.url.pathname.startsWith(r));
    const isAdminProtectedRoute = adminProtectedRoutes.some((r) => event.url.pathname.startsWith(r));
    const isPublicOnlyRoute = publicOnlyRoutes.some((r) => event.url.pathname.startsWith(r));

    // Apply protection.
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

    return null;
};