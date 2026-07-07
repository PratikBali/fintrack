/**
 * Patch-bump package.json before every Vercel build or local deploy.
 * Set BUMP_VERSION=1 (deploy.mjs) or run on Vercel (VERCEL=1).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const shouldBump =
  process.env.VERCEL === "1" || process.env.BUMP_VERSION === "1";

if (!shouldBump) {
  console.log("Version bump skipped (not a deploy build).");
  process.exit(0);
}

const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const parts = pkg.version.split(".").map((n) => parseInt(n, 10) || 0);
const [major = 0, minor = 0, patch = 0] = parts;
const next = `${major}.${minor}.${patch + 1}`;

if (next === pkg.version) {
  console.log(`Version unchanged: ${pkg.version}`);
  process.exit(0);
}

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Version bumped → ${next}`);

if (
  process.env.GITHUB_TOKEN &&
  process.env.VERCEL === "1" &&
  process.env.VERCEL_GIT_REPO_OWNER &&
  process.env.VERCEL_GIT_REPO_SLUG &&
  process.env.VERCEL_GIT_COMMIT_REF
) {
  try {
    execSync('git config user.email "vercel@fintrack.local"', { stdio: "pipe" });
    execSync('git config user.name "Vercel Deploy"', { stdio: "pipe" });
    execSync("git add package.json", { stdio: "pipe" });
    execSync(`git commit -m "chore: release v${next} [skip ci]"`, {
      stdio: "pipe",
    });
    const remote = `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}.git`;
    execSync(`git push ${remote} HEAD:${process.env.VERCEL_GIT_COMMIT_REF}`, {
      stdio: "inherit",
    });
    console.log("Version bump pushed to git.");
  } catch (err) {
    console.warn(
      "Version bump not pushed to git:",
      err instanceof Error ? err.message : err
    );
  }
}
