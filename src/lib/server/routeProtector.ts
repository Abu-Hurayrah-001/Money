import { json, redirect, type RequestEvent } from "@sveltejs/kit";
import type { AccessTokenData } from "./types/auth";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET } from "$env/static/private";

const loginProtectedRoutes = ["/api/user", "/api/auth-protected"];
const adminProtectedRoutes = ["/api/admin"];
const publicOnlyRoutes = ["/api/auth-not-protected"];

function apiResponse(
    success: boolean,
    message: string,
    status: number,
) {
    return json({
        success,
        message,
    }, { status });
};

export default function routeProtector(event: RequestEvent): Response | null {
    // Authentication state.
    const [scheme, accessToken] = (event.request.headers.get("authorization") ?? "").split(" ");
    if (scheme === "Bearer" && accessToken) {
        try {
            const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
            event.locals.user = decoded as AccessTokenData;
        } catch (error) {
            // Do nothing, LOL!!
        };
    };

    // Find protection type.
    const path = event.url.pathname
    const isLoginProtectedRoute = loginProtectedRoutes.some((r) => path.startsWith(r));
    const isAdminProtectedRoute = adminProtectedRoutes.some((r) => path.startsWith(r));
    const isPublicOnlyRoute = publicOnlyRoutes.some((r) => path.startsWith(r));

    // Apply protection.
    if (isPublicOnlyRoute && event.locals.user) {
        if (event.url.pathname.startsWith("/api")) {
            return apiResponse(false, "Only logged-out users allowed.", 403);
        } else {
            throw redirect(303, "/user/profile");
        };
    };
    if (isLoginProtectedRoute && !event.locals.user) {
        if (event.url.pathname.startsWith("/api")) {
            return apiResponse(false, "Only logged-in users allowed.", 401);
        } else {
            throw redirect(303, "/auth/login");
        };
    };
    if (isAdminProtectedRoute && event.locals.user?.role !== "Admin") {
        if (event.url.pathname.startsWith("/api")) {
            return apiResponse(false, "Only admins allowed.", 403);
        } else {
            throw redirect(303, "/user/profile");
        };
    };

    return null;
};