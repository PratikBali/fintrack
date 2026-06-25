/**
 * One-shot deploy: auth preflight -> Vercel -> Firestore rules.
 *
 * Usage:
 *   npm run deploy            # production (default)
 *   npm run deploy -- preview # Vercel preview deploy instead of prod
 *
 * Any failing step aborts the rest.
 */
import { spawnSync } from "node:child_process";

const PROJECT = "fintrack-hydra-pro";
const isPreview = process.argv.slice(2).includes("preview");

// This machine sits behind a TLS-inspecting proxy (self-signed cert in chain),
// which makes the Vercel/Firebase CLIs fail with "self-signed certificate".
// Relax verification for the deploy unless the user already set it. The proper
// fix is to point NODE_EXTRA_CA_CERTS at the corporate root CA instead.
process.env.NODE_TLS_REJECT_UNAUTHORIZED =
  process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? "0";

function run(label, command) {
  console.log(`\n\u25B6 ${label}\n  ${command}`);
  const res = spawnSync(command, { stdio: "inherit", shell: true });
  if (res.status !== 0) {
    console.error(`\n\u2716 ${label} failed (exit ${res.status ?? "?"}). Aborting deploy.`);
    process.exit(res.status || 1);
  }
}

console.log(`FinTrack deploy \u2192 ${isPreview ? "PREVIEW" : "PRODUCTION"}`);

run("Validate auth config", "node scripts/validate-auth.mjs");
run(
  "Deploy app to Vercel",
  `npx vercel deploy${isPreview ? "" : " --prod"} --yes`
);
run(
  "Deploy Firestore rules",
  `npx firebase-tools deploy --only firestore:rules --project ${PROJECT}`
);

console.log(`\n\u2713 Deploy complete (${isPreview ? "preview" : "production"}).`);
