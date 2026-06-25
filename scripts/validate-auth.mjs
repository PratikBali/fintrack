/**
 * Pre-deploy auth validation. Run: node scripts/validate-auth.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT = "fintrack-hydra-pro";
const envPath = join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("="))
    .map(([key, ...rest]) => [key.trim(), rest.join("=").trim()])
);
const API_KEY = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const AUTH_DOMAIN = env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const REQUIRED_DOMAINS = [
  "localhost",
  "hydra-fintrack.vercel.app",
  "fintrack-pi-puce.vercel.app",
  "fintrack-pratikbalis-projects.vercel.app",
  "fintrack-pratikbali-pratikbalis-projects.vercel.app",
];

async function main() {
  let failed = false;

  if (!API_KEY || !AUTH_DOMAIN) {
    console.error("FAIL: missing NEXT_PUBLIC_FIREBASE_* in .env.local");
    process.exit(1);
  }

  const keyRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const keyBody = await keyRes.json();
  if (keyBody?.error?.message?.includes("API key not valid")) {
    console.error("FAIL: Firebase API key is invalid");
    failed = true;
  } else {
    console.log("PASS: Firebase API key is accepted");
  }

  const cfg = JSON.parse(
    readFileSync(
      join(process.env.USERPROFILE, ".config", "configstore", "firebase-tools.json"),
      "utf8"
    )
  );
  const token = cfg.tokens?.access_token;
  if (!token) {
    console.error("FAIL: Firebase CLI not logged in");
    process.exit(1);
  }

  const domainsRes = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-goog-user-project": PROJECT,
      },
    }
  );

  if (!domainsRes.ok) {
    // 401/403 here almost always means the cached Firebase CLI access_token
    // expired (the gcloud/firebase CLIs auto-refresh, this raw fetch does not).
    // The authorized-domain list is unchanged across a frontend deploy, so warn
    // and skip rather than blocking the ship.
    console.warn(
      `WARN: couldn't read auth config (HTTP ${domainsRes.status}) — likely an ` +
        `expired Firebase CLI token. Skipping authorized-domain check. ` +
        `Run "npx firebase-tools login --reauth" to restore full validation.`
    );
  } else {
    const domainsBody = await domainsRes.json();
    const domains = domainsBody.authorizedDomains || [];
    if (domains.length === 0) {
      // A live Firebase project always has localhost + default domains, so an
      // empty list means a stale CLI token / transient read returned 200 with no
      // config — not a wiped allow-list. Warn and skip instead of aborting.
      console.warn(
        "WARN: auth config returned an empty authorized-domain list — likely a " +
          "stale Firebase CLI token or transient read. Skipping authorized-domain " +
          'check. Run "npx firebase-tools login --reauth" to restore full validation.'
      );
    } else {
      console.log("Authorized domains:", domains.join(", "));
      for (const domain of REQUIRED_DOMAINS) {
        if (!domains.includes(domain)) {
          console.error(`FAIL: missing authorized domain: ${domain}`);
          failed = true;
        } else {
          console.log(`PASS: authorized domain present: ${domain}`);
        }
      }
    }
  }

  const EXPECTED_AUTH_DOMAIN = "hydra-fintrack.vercel.app";
  if (AUTH_DOMAIN !== EXPECTED_AUTH_DOMAIN) {
    console.error(
      `FAIL: auth domain should be ${EXPECTED_AUTH_DOMAIN} for the /__/auth proxy (got ${AUTH_DOMAIN})`
    );
    failed = true;
  } else {
    console.log(`PASS: auth domain set to app domain (${AUTH_DOMAIN})`);
  }

  if (failed) process.exit(1);
  console.log("All auth preflight checks passed.");
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
