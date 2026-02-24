import { apiRequest } from "./api.js";

export async function requireSession() {
  const payload = await apiRequest("/api/auth/me");
  return payload?.user || null;
}
