import { json } from "@sveltejs/kit";

export function GET() {
    const data = {
        success: true,
        message: 'Welcome to our backend homepage.',
    };

    return json(data, { status: 200 });
};