import { json } from "@sveltejs/kit";

export function GET() {
    return json({
        success: true,
        message: 'Welcome to our backend homepage.',
    }, { status: 200 });
};