import path from "node:path";
import {
  appendJsonLine,
  ensureDir,
  listDirsSortedByMtime,
  readJson,
  readJsonLines,
  writeJson,
} from "../../lib/fs.js";
import { writeFile } from "node:fs/promises";
import type { Message, SessionMeta, SessionSnapshot, ToolCallRecord } from "./types.js";

/**
 * Parses persisted timestamps defensively so malformed values do not break
 * session recency ordering.
 */
const toSessionTimestamp = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const compareSessionRecency = (left: SessionMeta, right: SessionMeta) =>
  toSessionTimestamp(right.updatedAt) - toSessionTimestamp(left.updatedAt) ||
  toSessionTimestamp(right.createdAt) - toSessionTimestamp(left.createdAt);

/**
 * Filesystem-backed store for session metadata, transcript messages, tool call
 * records, and generated artifacts.
 */
export class SessionStore {
  constructor(private readonly rootDir: string) {}

  /**
   * Creates the session directory structure and persists initial metadata.
   */
  async create(meta: SessionMeta) {
    const sessionDir = this.getSessionDir(meta.id);
    await ensureDir(sessionDir);
    await writeJson(this.getSessionFile(meta.id), meta);
    await this.ensureArtifactsDir(meta.id);
    return meta;
  }

  /**
   * Persists the current session metadata snapshot.
   */
  async saveMeta(meta: SessionMeta) {
    await writeJson(this.getSessionFile(meta.id), meta);
  }

  /**
   * Appends a transcript message to the session log.
   */
  async appendMessage(sessionId: string, message: Message) {
    await appendJsonLine(this.getMessagesFile(sessionId), message);
  }

  /**
   * Appends a tool call record to the session log.
   */
  async appendToolCall(sessionId: string, toolCall: ToolCallRecord) {
    await appendJsonLine(this.getToolCallsFile(sessionId), toolCall);
  }

  /**
   * Loads the most recently updated session, if one exists.
   */
  async loadLatest(): Promise<SessionSnapshot | null> {
    const latest = (await this.listMetas())[0];

    if (!latest) {
      return null;
    }

    return this.load(latest.id);
  }

  /**
   * Lists session metadata sorted by recency.
   */
  async listMetas(): Promise<SessionMeta[]> {
    const sessionRoot = path.join(this.rootDir, "sessions");
    const dirs = await listDirsSortedByMtime(sessionRoot);
    const metas = await Promise.all(
      dirs.map(({ name }) => readJson<SessionMeta>(this.getSessionFile(name)).catch(() => null)),
    );

    return metas.filter((meta): meta is SessionMeta => Boolean(meta)).sort(compareSessionRecency);
  }

  /**
   * Reconstructs a full session snapshot from persisted files.
   */
  async load(sessionId: string): Promise<SessionSnapshot | null> {
    const meta = await readJson<SessionMeta>(this.getSessionFile(sessionId)).catch(() => null);

    if (!meta) {
      return null;
    }

    const messages = await readJsonLines<Message>(this.getMessagesFile(sessionId));
    const toolCalls = await readJsonLines<ToolCallRecord>(this.getToolCallsFile(sessionId));

    return {
      meta,
      messages,
      toolCalls,
    };
  }

  /**
   * Stores an artifact payload and a tiny sidecar metadata file for later inspection.
   */
  async writeArtifact(sessionId: string, artifactId: string, content: string) {
    const targetPath = path.join(this.getArtifactsDir(sessionId), `${artifactId}.txt`);
    await ensureDir(path.dirname(targetPath));
    await writeFile(targetPath, content, "utf8");
    await writeJson(`${targetPath}.meta.json`, {
      id: artifactId,
      size: content.length,
    });
    return targetPath;
  }

  private async ensureArtifactsDir(sessionId: string) {
    await ensureDir(this.getArtifactsDir(sessionId));
  }

  private getSessionDir(sessionId: string) {
    return path.join(this.rootDir, "sessions", sessionId);
  }

  private getSessionFile(sessionId: string) {
    return path.join(this.getSessionDir(sessionId), "session.json");
  }

  private getMessagesFile(sessionId: string) {
    return path.join(this.getSessionDir(sessionId), "messages.jsonl");
  }

  private getToolCallsFile(sessionId: string) {
    return path.join(this.getSessionDir(sessionId), "tool-calls.jsonl");
  }

  private getArtifactsDir(sessionId: string) {
    return path.join(this.getSessionDir(sessionId), "artifacts");
  }
}
