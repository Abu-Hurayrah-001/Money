import { json } from "@sveltejs/kit";
import { z } from "zod";
import prisma from "$lib/db";
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, NODE_ENV } from "$env/static/private";
import jwt from "jsonwebtoken";
import type { RequestEvent } from "./$types";

type RequestData = {
    email: string;
    OTP: number;
};

const requestSchema = z.object({
    email: z.string().email(),
    OTP: z
        .number()
        .refine(
            (val: number) => val.toString().length === 6,
            { message: "OTP must have 6 digits." }
        ),
});

export async function POST({ request, cookies }: RequestEvent): Promise<Response> {
    try {
        // Validate request data.
        const requestData: RequestData = await request.json();
        const validationResult = requestSchema.safeParse(requestData);
        if (!validationResult.success) {
            const validationError = validationResult.error.errors[0]?.message || "Invalid data entered.";
            return json({
                success: false,
                message: validationError,
            }, { status: 400 });
        };

        // Retrieve user from the db.
        const user = await prisma.user.findUnique({ where: { email: requestData.email } });
        if (!user) {
            return json({
                success: false,
                message: "User does not exist."
            }, { status: 409 });
        };

        // Verify entered OTP.
        if (requestData.OTP !== user.OTP) {
            return json({
                success: false,
                message: "OTP is incorrect.",
            }, { status: 401 });
        };

        // Update OTP expiry time in db.
        const currentTime = Date.now();
        const OTPexpiryTime = user.OTPexpiry.valueOf();
        if (currentTime > OTPexpiryTime) {
            return json({
                success: false,
                message: "OTP has expired.",
            }, { status: 401 });
        } else {
            // Ensuring user can't enter same OTP again.
            await prisma.user.update({
                where: { id: user.id },
                data: { OTPexpiry: new Date() },
            });
        };

        // Refresh token setup.
        const refreshToken = jwt.sign(
            { id: user.id },
            REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" },
        );
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken },
        });
        cookies.set("refreshToken", refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days.
        });

        // Access Token setup.
        const accessToken = jwt.sign(
            { id: user.id },
            ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" }
        );
        return json({
            success: true,
            message: "Logged in successfully.",
            accessToken,
        });
    } catch (error) {
        console.error(error);
        return json({
            success: false,
            message: "An unknown error has occured."
        }, { status: 500 });
    };
};