import { handleTalk } from "../server/talk.js";

// Vercel function: POST /api/talk
export function POST(request: Request): Promise<Response> {
  return handleTalk(request);
}
