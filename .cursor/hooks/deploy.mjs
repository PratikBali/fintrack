#!/usr/bin/env node
// Cursor "stop" hook: fire-and-forget Vercel production deploy after every agent turn.
// Spawns the deploy detached so the agent turn is never blocked; an overlap lock
// prevents stacking concurrent deploys. NODE_TLS_REJECT_UNAUTHORIZED=0 works around
// the corporate self-signed TLS proxy (see hardening note in chat summary).

import { spawn } from "node:child_process";
import { openSync, existsSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const lock = join(here, "deploy.lock");
const log = join(here, "last-deploy.log");
const LOCK_TTL_MS = 20 * 60 * 1000;

const done = (obj) => {
  try {
    process.stdout.write(JSON.stringify(obj));
  } catch {}
  process.exit(0);
};

// Drain stdin (hook handshake) but don't depend on it.
try {
  process.stdin.resume();
  process.stdin.on("data", () => {});
  process.stdin.on("error", () => {});
} catch {}

if (!existsSync(join(root, ".vercel", "project.json"))) {
  done({ skipped: "project not linked to Vercel (.vercel/project.json missing)" });
}

const locked =
  existsSync(lock) &&
  (() => {
    try {
      return Date.now() - statSync(lock).mtimeMs < LOCK_TTL_MS;
    } catch {
      return false;
    }
  })();

if (locked) done({ skipped: "deploy already in progress" });

try {
  writeFileSync(lock, new Date().toISOString());
  const out = openSync(log, "w");
  const isWin = process.platform === "win32";
  const sep = isWin ? "&" : ";";
  const clearLock = isWin ? `del /f /q "${lock}"` : `rm -f "${lock}"`;
  const command = `npx vercel deploy --prod --yes ${sep} ${clearLock}`;

  const child = spawn(command, {
    cwd: root,
    shell: true,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", out, out],
    env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
  });
  child.unref();
  done({ started: true, log });
} catch (err) {
  done({ error: String(err) });
}
