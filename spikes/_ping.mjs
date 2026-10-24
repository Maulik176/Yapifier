import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ timeout: 25_000, maxRetries: 0 });
const t0 = Date.now();
try {
  const r = await client.messages.create({ model: "claude-opus-5-5", max_tokens: 50, output_config: { effort: "low" }, messages: [{ role: "user", content: "Say ok." }] });
  console.log("ok", Date.now() - t0, "ms", r.stop_reason, r.content.find((b) => b.type === "text")?.text);
} catch (e) {
  console.log("error after", Date.now() - t0, "ms:", e?.constructor?.name, e?.status ?? "", String(e?.message).slice(0, 200));
}
