import { createHash } from "crypto";

export default function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
};