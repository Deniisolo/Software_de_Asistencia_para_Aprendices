import { verifyAuthToken } from "@/src/server/config/auth/jwt";
import type { AuthUserPayload } from "@/src/server/config/types/auth.types";

export function getBearerUser(request: Request): AuthUserPayload | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyAuthToken(authHeader.slice(7));
}
