import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "scripts/fly-deploy.mjs");
const requiredEnv = [
  "NOTION_TOKEN=fixture-token",
  "NOTION_HABITS_DATA_SOURCE_ID=fixture-habits",
  "NOTION_COMPLETIONS_DATA_SOURCE_ID=fixture-completions"
].join("\n");

function tempDir() {
  return mkdtempSync(path.join(tmpdir(), "pockt-fly-deploy-"));
}

function runDeploy(env: Partial<NodeJS.ProcessEnv> = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    env: {
      PATH: "",
      ...process.env,
      ...env
    },
    encoding: "utf8"
  });
}

function writeMockFly(dir: string, body: string) {
  const binDir = path.join(dir, "bin");
  mkdirSync(binDir, { recursive: true });
  const flyPath = path.join(binDir, "fly");
  writeFileSync(flyPath, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  return binDir;
}

describe("Fly deploy helper", () => {
  it("fails clearly when the deployment env file is missing", () => {
    const dir = tempDir();

    const result = runDeploy({
      POCKT_DEPLOY_ENV_FILE: path.join(dir, ".env"),
      PATH: process.env.PATH
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing deployment env file");
    expect(result.stderr).not.toContain("fixture-token");
  });

  it("fails before calling Fly when a required secret is missing", () => {
    const dir = tempDir();
    const envFile = path.join(dir, ".env");
    writeFileSync(envFile, "NOTION_TOKEN=fixture-token\n");
    const callsFile = path.join(dir, "fly-calls.log");
    const binDir = writeMockFly(dir, `printf '%s\\n' "$*" >> ${JSON.stringify(callsFile)}`);

    const result = runDeploy({
      POCKT_DEPLOY_ENV_FILE: envFile,
      PATH: binDir
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing required deployment variables");
    expect(result.stderr).toContain("NOTION_HABITS_DATA_SOURCE_ID");
    expect(result.stderr).toContain("NOTION_COMPLETIONS_DATA_SOURCE_ID");
    expect(result.stderr).not.toContain("fixture-token");
    expect(() => readFileSync(callsFile, "utf8")).toThrow();
  });

  it("fails clearly when the Fly CLI is unavailable", () => {
    const dir = tempDir();
    const envFile = path.join(dir, ".env");
    const emptyBinDir = path.join(dir, "bin");
    mkdirSync(emptyBinDir);
    writeFileSync(envFile, `${requiredEnv}\n`);

    const result = runDeploy({
      POCKT_DEPLOY_ENV_FILE: envFile,
      PATH: emptyBinDir
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Fly CLI is unavailable");
    expect(result.stderr).not.toContain("fixture-token");
  });

  it("fails clearly when Fly authentication is missing", () => {
    const dir = tempDir();
    const envFile = path.join(dir, ".env");
    writeFileSync(envFile, `${requiredEnv}\n`);
    const callsFile = path.join(dir, "fly-calls.log");
    const binDir = writeMockFly(
      dir,
      [
        `printf '%s\\n' "$*" >> ${JSON.stringify(callsFile)}`,
        `if [ "$1" = "--version" ]; then exit 0; fi`,
        `if [ "$1" = "auth" ] && [ "$2" = "whoami" ]; then exit 1; fi`,
        `exit 64`
      ].join("\n")
    );

    const result = runDeploy({
      POCKT_DEPLOY_ENV_FILE: envFile,
      PATH: binDir
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Fly authentication is missing");
    expect(result.stderr).not.toContain("fixture-token");
    expect(readFileSync(callsFile, "utf8").trim().split("\n")).toEqual(["--version", "auth whoami"]);
  });

  it("stages only required secrets and deploys from the repository root", () => {
    const dir = tempDir();
    const envFile = path.join(dir, ".env");
    writeFileSync(envFile, `${requiredEnv}\nEXTRA_SECRET=do-not-sync\n`);
    const callsFile = path.join(dir, "fly-calls.log");
    const binDir = writeMockFly(
      dir,
      [
        `printf '%s|%s\\n' "$PWD" "$*" >> ${JSON.stringify(callsFile)}`,
        `if [ "$1" = "--version" ]; then exit 0; fi`,
        `if [ "$1" = "auth" ] && [ "$2" = "whoami" ]; then exit 0; fi`,
        `if [ "$1" = "secrets" ] && [ "$2" = "set" ]; then exit 0; fi`,
        `if [ "$1" = "deploy" ]; then exit 0; fi`,
        `exit 64`
      ].join("\n")
    );

    const result = runDeploy({
      POCKT_DEPLOY_ENV_FILE: envFile,
      PATH: binDir
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Deploying pockt");
    expect(result.stdout).not.toContain("fixture-token");
    expect(result.stderr).not.toContain("fixture-token");

    const calls = readFileSync(callsFile, "utf8").trim().split("\n");
    expect(calls).toEqual([
      `${repoRoot}|--version`,
      `${repoRoot}|auth whoami`,
      `${repoRoot}|secrets set --app pockt --stage NOTION_TOKEN=fixture-token NOTION_HABITS_DATA_SOURCE_ID=fixture-habits NOTION_COMPLETIONS_DATA_SOURCE_ID=fixture-completions`,
      `${repoRoot}|deploy --app pockt`
    ]);
    expect(calls.join("\n")).not.toContain("EXTRA_SECRET");
  });
});
