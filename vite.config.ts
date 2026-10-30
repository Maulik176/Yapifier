import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleApply } from "./server/apply.js";
import { handleTalk } from "./server/talk.js";

// In local dev, serve /api/apply and /api/talk from the same handlers Vercel runs in production.
function localApi(): Plugin {
  const routes: [string, (request: Request) => Promise<Response>][] = [
    ["/api/apply", handleApply],
    ["/api/talk", handleTalk],
  ];
  return {
    name: "local-api",
    configureServer(server) {
      for (const [path, handle] of routes) {
        server.middlewares.use(path, async (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const request = new Request(`http://localhost${path}`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-forwarded-for": req.socket.remoteAddress ?? "local" },
            body: Buffer.concat(chunks),
          });
          const response = await handle(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env.local visible to the server-side handler during dev.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    // Short commit id on the page, so anyone can tell which build is live.
    define: { __BUILD__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7)) },
    plugins: [react(), localApi()],
    // node_modules is a link to node_modules.nosync (kept out of iCloud Desktop sync);
    // keep the link's path so Vite still treats packages as dependencies.
    resolve: { preserveSymlinks: true },
  };
});
