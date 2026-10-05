// Modelle als "<provider>/<name>": Normalisierung, Migration alter Daten, Konstanten im Client-Paket.
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import * as C from "../client/src/index.ts";
import { Model, model, type ClaudeModel, type ModelId } from "../client/src/index.ts";
import { Store, modelFromLabel } from "../src/server/store.ts";
import * as S from "../src/shared/types.ts";
import { tmpDir } from "./helpers.ts";

let dir: string | undefined;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("Modell-IDs", () => {
  it("normalizeModel: alte Werte → claude/<x>, provider/name, ungültig → undefined", () => {
    expect(S.normalizeModel("haiku")).toBe("claude/haiku");
    expect(S.normalizeModel(" Opus ")).toBe("claude/opus");
    expect(S.normalizeModel("Whisper/large-v3")).toBe("whisper/large-v3");
    expect(S.normalizeModel("ollama/qwen2.5vl")).toBe("ollama/qwen2.5vl");
    for (const bad of ["gpt", "fable", "claude/", "/x", "a/b/c", "a b/c", "", undefined, null]) expect(S.normalizeModel(bad)).toBeUndefined();
    expect(S.providerOf("whisper/large-v3")).toBe("whisper");
    expect(modelFromLabel("model:haiku")).toBe("claude/haiku");
    expect(modelFromLabel("Model:Whisper/large-v3")).toBe("whisper/large-v3");
    expect(modelFromLabel("model:gpt")).toBeUndefined();
  });

  it("Migration: alte Issue-Dateien (opus|sonnet|haiku, ohne model) werden beim Laden zu claude/<x>", async () => {
    dir = await tmpDir();
    await mkdir(path.join(dir, "issues"), { recursive: true });
    const old = (id: number, model?: string) => ({
      issue: {
        id,
        title: `Alt ${id}`,
        body: "",
        status: "open",
        labels: [],
        ...(model ? { model } : {}),
        author: "nils",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        attachments: [],
        commentCount: 0,
        lastSeq: id,
      },
      entries: [{ seq: id, issueId: id, type: "event", author: "nils", createdAt: "2026-01-01T00:00:00.000Z", event: { kind: "opened" } }],
    });
    await writeFile(path.join(dir, "issues", "1.json"), JSON.stringify(old(1, "haiku")));
    await writeFile(path.join(dir, "issues", "2.json"), JSON.stringify(old(2)));
    await writeFile(path.join(dir, "issues", "3.json"), JSON.stringify(old(3, "sonnet")));
    await writeFile(path.join(dir, "meta.json"), JSON.stringify({ seq: 3, nextId: 4 }));
    const s = await Store.open({ dataDir: dir, agent: "claude", user: "nils" });
    expect([1, 2, 3].map((i) => [s.getIssue(i)!.model, s.getIssue(i)!.provider])).toEqual([
      ["claude/haiku", "claude"],
      ["claude/opus", "claude"],
      ["claude/sonnet", "claude"],
    ]);
    // Anlegen mit altem Wert und mit Label
    expect((await s.createIssue({ title: "neu", author: "nils", model: "haiku" })).issue.model).toBe("claude/haiku");
    expect((await s.createIssue({ title: "lbl", author: "nils", labels: ["model:sonnet"] })).issue.model).toBe("claude/sonnet");
    await expect(s.createIssue({ title: "x", author: "nils", model: "quatsch" })).rejects.toThrow(/Ungültiges Modell/);
    expect(s.agentState(0).waiting.map((w) => w.provider)).toEqual(["claude", "claude", "claude", "claude", "claude"]);
  });
});

describe("Client: Model-Konstanten", () => {
  it("Model.CLAUDE.*, model(provider, name), Typen", () => {
    expect(Model.CLAUDE).toEqual({ OPUS: "claude/opus", SONNET: "claude/sonnet", HAIKU: "claude/haiku" });
    expect(model("whisper", "large-v3")).toBe("whisper/large-v3");
    expect(model("Ollama", "qwen2.5vl")).toBe("ollama/qwen2.5vl");
    expect(() => model("a b", "c")).toThrow(TypeError);
    expect(() => model("whisper", "")).toThrow(/Ungültiges Modell/);
    expect(C.DEFAULT_MODEL).toBe("claude/opus");
    expect(C.MODEL_NAMES[Model.CLAUDE.HAIKU]).toBe("Claude Haiku 4.5");

    expectTypeOf(Model.CLAUDE.HAIKU).toEqualTypeOf<"claude/haiku">();
    expectTypeOf<ClaudeModel>().toEqualTypeOf<"claude/opus" | "claude/sonnet" | "claude/haiku">();
    expectTypeOf(Model.CLAUDE.OPUS).toExtend<ModelId>();
    expectTypeOf<"whisper/large-v3">().toExtend<ModelId>();
    expectTypeOf<"opus">().not.toExtend<ModelId>();
    expectTypeOf<C.CreateIssueInput["model"]>().toEqualTypeOf<ModelId | undefined>();
  });

  it("Typen und Hilfsfunktionen entsprechen dem Server", () => {
    expectTypeOf<C.ModelId>().toEqualTypeOf<S.ModelId>();
    expectTypeOf<C.WaitingIssue>().toEqualTypeOf<S.WaitingIssue>();
    expectTypeOf<C.AgentWaitResult>().toEqualTypeOf<S.AgentWaitResult>();
    expectTypeOf<C.BoardInfo>().toEqualTypeOf<S.BoardInfo>();
    expect(C.MODEL_PATTERN.source).toBe(S.MODEL_PATTERN.source);
    for (const v of ["haiku", "x/y", "A/B", "nope"]) expect(C.normalizeModel(v)).toBe(S.normalizeModel(v));
  });
});
