// IMPORTS.
import { json } from "@sveltejs/kit";

// HOMEPAGE OF THE BACKEND.
export function GET() {
    const data = {
        success: true,
        message: 'Welcome to our backend.',
    };

    return json(data, { status: 200 });
};