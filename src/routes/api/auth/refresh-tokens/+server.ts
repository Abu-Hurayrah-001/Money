import { json, type RequestEvent } from "@sveltejs/kit";

export async function POST({ cookies }: RequestEvent): Promise<Response> {
    try {
        
    } catch (error) {
        console.error("Error refreshing tokens:", error);
        return json({
            success: false,
            message: "An unknown error has occured."
        }, { status: 500 });  
    };
};