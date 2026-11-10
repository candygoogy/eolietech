import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tools } from "./registry";

const git = (...args: string[]): string => execFileSync("git", args, { cwd: __dirname, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/** Commit history is needed; a shallow clone or a copy without .git skips the check. */
function historyAvailable(): boolean {
  try {
    return git("rev-parse", "--is-shallow-repository") === "false" && git("rev-parse", "--is-inside-work-tree") === "true";
  } catch {
    return false;
  }
}

describe("sitemap lastmod", () => {
  it.skipIf(!historyAvailable())("is not older than the latest commit in each tool folder", () => {
    const stale = tools.flatMap((tool) => {
      const latest = git("log", "-1", "--format=%cs", "--", path.join(__dirname, tool.id));
      return latest && latest > tool.updated ? [`${tool.id}: updated ${tool.updated}, last commit ${latest}`] : [];
    });
    expect(stale).toEqual([]);
  });
});
