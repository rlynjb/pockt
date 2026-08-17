#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REQUIRED_SECRET_NAMES = [
  "NOTION_TOKEN",
  "NOTION_HABITS_DATA_SOURCE_ID",
  "NOTION_COMPLETIONS_DATA_SOURCE_ID"
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const envFile = process.env.POCKT_DEPLOY_ENV_FILE
  ? path.resolve(process.env.POCKT_DEPLOY_ENV_FILE)
  : path.join(projectDir, ".env");
const flyConfig = path.join(projectDir, "fly.toml");

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

function main() {
  const appName = readFlyAppName(flyConfig);
  const env = readDeploymentEnv(envFile);
  const missing = REQUIRED_SECRET_NAMES.filter((name) => !env[name]);

  if (missing.length > 0) {
    fail(`Missing required deployment variables in ${displayPath(envFile)}: ${missing.join(", ")}`);
  }

  runFly(["--version"], "Fly CLI is unavailable. Install it from https://fly.io/docs/flyctl/install/");
  runFly(["auth", "whoami"], "Fly authentication is missing or unavailable. Run `fly auth login` and try again.");

  console.log(`Staging ${REQUIRED_SECRET_NAMES.length} Fly secrets for ${appName}: ${REQUIRED_SECRET_NAMES.join(", ")}`);
  runFly(
    [
      "secrets",
      "set",
      "--app",
      appName,
      "--stage",
      ...REQUIRED_SECRET_NAMES.map((name) => `${name}=${env[name]}`)
    ],
    "Failed to stage Fly secrets."
  );

  console.log(`Deploying ${appName} from ${projectDir}`);
  runFly(["deploy", "--app", appName], "Fly deployment failed.");
}

function readFlyAppName(configPath) {
  if (!existsSync(configPath)) {
    fail(`Missing Fly config at ${displayPath(configPath)}.`);
  }

  const config = readFileSync(configPath, "utf8");
  const match = config.match(/^\s*app\s*=\s*['"]([^'"]+)['"]\s*$/m);
  if (!match) {
    fail(`Missing app name in ${displayPath(configPath)}.`);
  }

  return match[1];
}

function readDeploymentEnv(filePath) {
  if (!existsSync(filePath)) {
    fail(`Missing deployment env file at ${displayPath(filePath)}. Create it from your local deployment values before running this helper.`);
  }

  const entries = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice("export ".length).trimStart() : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const name = normalized.slice(0, separatorIndex).trim();
    if (!REQUIRED_SECRET_NAMES.includes(name)) {
      continue;
    }

    entries[name] = parseEnvValue(normalized.slice(separatorIndex + 1).trim());
  }

  return entries;
}

function parseEnvValue(value) {
  const quote = value[0];
  if ((quote === `"` || quote === `'`) && value.endsWith(quote)) {
    const inner = value.slice(1, -1);
    return quote === `"` ? inner.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t") : inner;
  }

  const commentIndex = value.search(/\s#/);
  return (commentIndex === -1 ? value : value.slice(0, commentIndex)).trim();
}

function runFly(args, failureMessage) {
  const result = spawnSync("fly", args, {
    cwd: projectDir,
    env: process.env,
    stdio: "inherit"
  });

  if (result.error?.code === "ENOENT") {
    fail(failureMessage);
  }

  if (result.error) {
    fail(`${failureMessage} ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(failureMessage);
  }
}

function displayPath(filePath) {
  return path.relative(projectDir, filePath) || ".";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
