import { RESEND_API_KEY } from "$env/static/private";
import { json, error } from "@sveltejs/kit";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import { render } from "svelte/server";
import OTPemail from "$lib/emails/OTPemail.svelte";
import prisma from "$lib/db";
import type { RequestEvent } from "./$types";

type RequestData = {
    email: string;
};

const resend = new Resend(RESEND_API_KEY);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

export async function POST({ request }: RequestEvent) {
    try {
        const { email }: RequestData = await request.json();
        if (!email) {
            throw error(400, "Email is required.");
        };

        
    } catch (error) {
        
    }
}