import { handleApply } from "../server/apply";

// Vercel function: POST /api/apply
export function POST(request: Request): Promise<Response> {
  return handleApply(request);
}
