import { json, type RequestEvent } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import { REFRESH_TOKEN_SECRET } from "$env/static/private";
import prisma from "$lib/db";
import hashToken from "$lib/hashToken";

type RefreshTokenData = {
    id: string;
};

export async function POST({ cookies }: RequestEvent): Promise<Response> {
    try {
        // Retrieve the refreesh token from cookie.
        const refreshToken = cookies.get("refreshToken");
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

        // Clear refresh token form db and cookie.
        await prisma.user.update({
            where: { id },
            data: { refreshToken: null },
        });
        cookies.delete("refreshToken", { path: "/" });

        // Sending response.
    } catch (error) {
        cookies.delete("refreshToken", { path: "/" });
    };
};