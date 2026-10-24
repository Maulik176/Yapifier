import { handleApply } from "../server/apply.js";

// Vercel function: POST /api/apply
export function POST(request: Request): Promise<Response> {
  return handleApply(request);
}
