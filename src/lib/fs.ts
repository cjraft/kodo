import {mkdir, readdir, readFile, stat, writeFile} from "node:fs/promises";
import path from "node:path";

export const ensureDir = async (targetPath: string) => {
  await mkdir(targetPath, {recursive: true});
};

export const writeJson = async (targetPath: string, data: unknown) => {
  await ensureDir(path.dirname(targetPath));
  await writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

export const readJson = async <T>(targetPath: string) => {
  const raw = await readFile(targetPath, "utf8");
  return JSON.parse(raw) as T;
};

export const appendJsonLine = async (targetPath: string, data: unknown) => {
  await ensureDir(path.dirname(targetPath));
  const existing = await readFile(targetPath, "utf8").catch(() => "");
  const next = `${existing}${JSON.stringify(data)}\n`;
  await writeFile(targetPath, next, "utf8");
};

export const readJsonLines = async <T>(targetPath: string) => {
  const raw = await readFile(targetPath, "utf8").catch(() => "");
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
};

export const listDirsSortedByMtime = async (targetPath: string) => {
  const entries = await readdir(targetPath, {withFileTypes: true}).catch(() => []);
  const dirs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const fullPath = path.join(targetPath, entry.name);
        const info = await stat(fullPath);
        return {name: entry.name, mtimeMs: info.mtimeMs};
      })
  );

  return dirs.sort((left, right) => right.mtimeMs - left.mtimeMs);
};
