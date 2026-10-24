import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleApply } from "./server/apply";

// In local dev, serve /api/apply from the same handler Vercel runs in production.
function localApi(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use("/api/apply", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const request = new Request("http://localhost/api/apply", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": req.socket.remoteAddress ?? "local" },
          body: Buffer.concat(chunks),
        });
        const response = await handleApply(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env.local visible to the server-side handler during dev.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [react(), localApi()],
    // node_modules is a link to node_modules.nosync (kept out of iCloud Desktop sync);
    // keep the link's path so Vite still treats packages as dependencies.
    resolve: { preserveSymlinks: true },
  };
});
