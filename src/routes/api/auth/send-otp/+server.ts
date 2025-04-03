import { RESEND_API_KEY } from "$env/static/private";
import { json, error } from "@sveltejs/kit";
import { Resend } from "resend";
import { render } from "svelte/server";
import OTPemail from "$lib/emails/OTPemail.svelte";
import prisma from "$lib/db";
import type { RequestEvent } from "./$types";
import { z } from "zod";

type RequestData = {
    email: string;
};

const requestSchema = z.object({
    email: z.string()
        .min(1, "Email is required")
        .email("Invalid email address")
});

const resend = new Resend(RESEND_API_KEY);
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

export async function POST({ request }: RequestEvent) {
    try {
        const requestData: RequestData = await request.json();
        const validationResult = requestSchema.safeParse(requestData);
        if (!validationResult.success) {
            const validationError = validationResult.error.errors[0]?.message || "Invalid email address";
            throw error(400, validationError);
        };

        const OTP = generateOTP();
        const OTPexpiry = new Date(Date.now() + 30 * 1000); // 30 seconds extra for OTP expiry.
        
        // Update the user if email exists or create a new user if email does not exist.
        const user = await prisma.user.upsert({
            where: { email: requestData.email },
            update: { OTP, OTPexpiry },
            create: { 
                email: requestData.email,
                OTP,
                OTPexpiry,
            },
        });

        const { body } = render( OTPemail, { props: { OTP } });
        const { error: resendError } = await resend.emails.send({
            from: "Acme <onboarding@resend.dev>",
            to: requestData.email,
            subject: "Your login OTP code",
            html: body,
        });
        if ( resendError ) {
            console.error(resendError);
            throw error(500, resendError);
        };

        return json({
            success: true,
            message: "OTP sent successfully",
            userId: user.id,
        }, {status: 200});
    } catch (err) {
        console.error(err);
        throw error(500, "An error ocurred while sending OTP");
    };
};