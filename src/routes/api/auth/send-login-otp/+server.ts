import { RESEND_API_KEY, RESEND_EMAIL } from "$env/static/private";
import { json } from "@sveltejs/kit";
import { Resend } from "resend";
import { render } from "svelte/server";
import OTPemail from "$lib/emails/OTPemail.svelte";
import prisma from "$lib/db";
import type { RequestEvent } from "./$types";
import { z } from "zod";
import { customRateLimit } from "$lib/server/utils/customRateLimiter";

type RequestData = {
    email: string;
};

const requestSchema = z.object({
    email: z.string().email("Invalid email address"),
});

const resend = new Resend(RESEND_API_KEY);
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

export async function POST(event: RequestEvent): Promise<Response> {
    try {
        // Custom rate limiting.
        const clientIP = event.getClientAddress();
        const { limited, message } = customRateLimit(clientIP, "send-login-otp", {
            limit : 10,
            windowMs: 10 * 60 * 1000
        });
        if (limited) {
            return json({
                success: false,
                message,
            }, { status: 429 });
        };

        // Validate request data.
        const request = event.request;
        const requestData: RequestData = await request.json();
        const validationResult = requestSchema.safeParse(requestData);
        if (!validationResult.success) {
            const validationError = validationResult.error.errors[0]?.message || "Invalid email address";
            return json({
                success: false,
                message: validationError,
            }, {status: 400});
        };

        const OTP = generateOTP();
        const OTPexpiry = new Date(Date.now() + 10 * 60 * 1000); // 45 seconds extra for OTP expiry.
        
        // Update the user if email exists or create a new user if email does not exist.
        await prisma.user.upsert({
            where: { email: requestData.email },
            update: { OTP, OTPexpiry },
            create: { 
                email: requestData.email,
                OTP,
                OTPexpiry,
            },
        });

        // Send the OTP to email.
        const { body } = render( OTPemail, { props: { OTP } });
        const { error: resendError } = await resend.emails.send({
            from: RESEND_EMAIL,
            to: requestData.email,
            subject: "Your login OTP code",
            html: body,
        });
        if ( resendError ) {
            console.error(resendError);
            return json({
                success: false,
                message: resendError,
            }, { status: 500 });
        };

        // Send response.
        return json({
            success: true,
            message: "OTP sent successfully",
        }, {status: 200});
    } catch (err) {
        console.error(err);
        return json({
            success: false,
            message: "An unknown error has occured.",
        }, { status: 500 });
    };
};