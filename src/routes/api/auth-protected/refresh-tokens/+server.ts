import { json, type RequestEvent } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import { REFRESH_TOKEN_SECRET, ACCESS_TOKEN_SECRET, NODE_ENV } from "$env/static/private";
import prisma from "$lib/server/db";
import hashToken from "$lib/server/hashToken";
import { type RefreshTokenData } from "$lib/server/types/auth";

export async function POST({ cookies }: RequestEvent): Promise<Response> {
    let id: string | undefined;
    try {
        // Retrieve the refresh token from cookie.
        const refreshToken = cookies.get("refreshToken") as string;
        if (!refreshToken) {
            return json({
                success: false,
                message: "No refresh token provided.",
            }, { status: 401 });
        };

        // Verify the refresh token.
        const decoded = jwt.verify(refreshToken as string, REFRESH_TOKEN_SECRET);

        // Retrieve user using the token's data.
        id = (decoded as RefreshTokenData).id;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            cookies.delete("refreshToken", { path: "/" });
            return json({
                success: false,
                message: "User not found.",
            }, { status: 401 });
        };

        // Hash the refresh token and compare it with the hashed refresh token in db.
        const hashedRefreshToken = hashToken(refreshToken);
        if (user.refreshToken !== hashedRefreshToken) {
            await prisma.user.update({
                where: { id },
                data: { refreshToken: null },
            });
            cookies.delete("refreshToken", { path: "/" });
            return json({
                success: false,
                message: "Refresh token mismatch.",
            }, { status: 401 });
        };

        // Update db with new refresh token.
        const newRefreshToken = jwt.sign(
            { id },
            REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" },
        );
        const hashedNewRefreshToken = hashToken(newRefreshToken);
        await prisma.user.update({
            where: { id },
            data: { refreshToken: hashedNewRefreshToken },
        });
        cookies.set("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days.
        });

        // Sending a new access token.
        const newAccessToken = jwt.sign(
            {
                id: user.id,
                role: user.role,
            },
            ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" },
        );
        return json({
            success: true,
            message: "Tokens refreshed successfully.",
            accessToken: newAccessToken,
        });
    } catch (error) {
        if (id) {
            await prisma.user.update({
                where: { id },
                data: { refreshToken: null },
            });
        };
        cookies.delete("refreshToken", { path: "/" });
        console.error("Error refreshing tokens:", error);
        return json({
            success: false,
            message: "Error refreshing tokens."
        }, { status: 500 });  
    };
};