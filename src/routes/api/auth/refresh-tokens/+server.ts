import { json, type RequestEvent } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import { REFRESH_TOKEN_SECRET, ACCESS_TOKEN_SECRET, NODE_ENV } from "$env/static/private";
import prisma from "$lib/db";
import hashToken from "$lib/hashToken";

type RefreshTokenData = {
    id: string;
};

export async function POST({ cookies }: RequestEvent): Promise<Response> {
    try {
        // Retrieve the refreesh token from cookie.
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
        const id = (decoded as RefreshTokenData).id;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return json({
                success: false,
                message: "User not found.",
            }, { status: 401 });
        };

        // Hash the refresh token and compare it with the hashed refresh token in db.
        const hashedRefreshToken = hashToken(refreshToken);
        if (user.refreshToken !== hashedRefreshToken) {
            return json({
                success: false,
                message: "Refresh token mismatch.",
            }, { status: 401 });
        };

        // New refresh token setup.
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
            { id: user.id },
            ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" }
        );
        return json({
            success: true,
            message: "Tokens refreshed successfully.",
            accessToken: newAccessToken,
        });
    } catch (error) {
        console.error("Error refreshing tokens:", error);
        return json({
            success: false,
            message: "An unknown error has occured."
        }, { status: 500 });  
    };
};