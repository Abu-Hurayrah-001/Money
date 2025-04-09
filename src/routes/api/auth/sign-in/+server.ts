import { json } from "@sveltejs/kit";
import { z } from "zod";
import prisma from "$lib/db";
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
        
    } catch (error) {
        console.error(error);
        return json({
            success: false,
            message: "An unknown error has occured."
        }, { status: 500 });
    };
};