// Beispiel: Programm fragt über das offizielle openai-Paket (OpenAI-Adapter → ein Issue mit Label "api").
// Start: npx tsx examples/openai-client.ts "Deine Frage"
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AB_URL ? `${process.env.AB_URL}/v1` : "http://127.0.0.1:4317/v1",
  apiKey: process.env.AB_API_KEY ?? "beliebig", // nur nötig, wenn der Server AB_API_KEY verlangt
  timeout: 11 * 60 * 1000, // der Adapter wartet bis zu AB_COMPLETION_TIMEOUT (600 s)
});

const question = process.argv.slice(2).join(" ") || "Fasse bitte zusammen, was im Projekt zuletzt passiert ist.";
const res = await openai.chat.completions.create({
  model: "agent-board",
  user: "beispiel", // erscheint als Autor „programm:beispiel“
  messages: [{ role: "user", content: question }],
});
const issueId = (res as unknown as { issue_id: number }).issue_id;
console.log(`Issue #${issueId}:\n${res.choices[0]?.message.content}`);

// Fortsetzen im selben Issue:
// await openai.chat.completions.create({ model: "agent-board", messages: [...], metadata: { issue_id: String(issueId) } });
