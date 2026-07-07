/**
 * Vercel ignoreCommand: skip rebuild when only package.json was bumped.
 * Exit 0 = skip, exit 1 = build.
 */
import { execSync } from "node:child_process";

const from = process.env.VERCEL_GIT_PREVIOUS_SHA;
const to = process.env.VERCEL_GIT_COMMIT_SHA;

if (!from || !to || from === to) {
  process.exit(1);
}

let files;
try {
  files = execSync(`git diff --name-only ${from} ${to}`, { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
} catch {
  process.exit(1);
}

const onlyVersionFiles = files.every(
  (f) => f === "package.json" || f === "package-lock.json"
);

process.exit(onlyVersionFiles && files.length > 0 ? 0 : 1);
