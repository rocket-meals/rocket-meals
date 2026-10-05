// Zod-Schemas für Request-Bodies.
import { z } from "zod";
import { ISSUE_STATUSES, type ModelId, normalizeModel } from "../shared/types.ts";
import { HttpError } from "./http.ts";

export const statusSchema = z.enum(ISSUE_STATUSES);
/** "provider/name" (z. B. claude/opus, whisper/large-v3); alte Werte opus|sonnet|haiku → claude/<x>. */
export const modelSchema = z
  .string()
  .max(100)
  .transform((v, ctx): ModelId => {
    const m = normalizeModel(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: `Ungültiges Modell "${v}" – erwartet provider/name, z. B. claude/opus oder whisper/large-v3` });
      return z.NEVER;
    }
    return m;
  });
const author = z.string().min(1).max(100);
const label = z.string().min(1).max(50);

/** Anhang: Referenz auf hochgeladene Datei oder Inhalt inline (base64). */
export const attachmentInput = z.union([
  z.object({ sha256: z.string().min(8).max(64), name: z.string().max(200).optional() }),
  z.object({ name: z.string().min(1).max(200), mime: z.string().max(100).optional(), contentBase64: z.string() }),
]);
export type AttachmentInput = z.infer<typeof attachmentInput>;

export const createIssueSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().max(200_000).optional(),
  labels: z.array(label).max(20).optional(),
  model: modelSchema.optional(),
  author: author.optional(),
  assignee: author.optional(),
  attachments: z.array(attachmentInput).max(20).optional(),
});

export const commentSchema = z.object({
  body: z.string().min(1).max(200_000),
  author: author.optional(),
  attachments: z.array(attachmentInput).max(20).optional(),
  status: statusSchema.optional(),
  reason: z.string().max(2000).optional(),
});

export const patchIssueSchema = z.object({
  author: author.optional(),
  status: statusSchema.optional(),
  reason: z.string().max(2000).optional(),
  title: z.string().min(1).max(300).optional(),
  body: z.string().max(200_000).optional(),
  labels: z.array(label).max(20).optional(),
  addLabels: z.array(label).max(20).optional(),
  removeLabels: z.array(label).max(20).optional(),
  assignee: author.nullable().optional(),
  model: modelSchema.optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1).max(320),
  password: z.string().min(1).max(1000),
});

export const claimSchema = z.object({
  agent: author,
  reason: z.string().max(2000).optional(),
  /** Nur übernehmen, wenn das Issue zu diesem Provider gehört (sonst 409), außer force. */
  provider: z.string().max(50).optional(),
  force: z.boolean().optional(),
});

export const uploadJsonSchema = z.object({
  name: z.string().min(1).max(200),
  mime: z.string().max(100).optional(),
  contentBase64: z.string(),
});

// OpenAI: content darf String oder Array aus Teilen sein
const contentPart = z.object({ type: z.string(), text: z.string().optional() }).passthrough();
export const completionSchema = z
  .object({
    model: z.string().optional(),
    messages: z
      .array(
        z
          .object({
            role: z.string(),
            content: z.union([z.string(), z.array(contentPart), z.null()]).optional(),
            name: z.string().optional(),
          })
          .passthrough(),
      )
      .min(1),
    stream: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    user: z.string().optional(),
  })
  .passthrough();

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    throw new HttpError(400, msg);
  }
  return r.data;
}
