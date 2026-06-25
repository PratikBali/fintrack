import { getAuthDomains, updateAuthDomains } from "../node_modules/firebase-tools/lib/gcp/auth.js";

const PROJECT = "fintrack-hydra-pro";
const REQUIRED = [
  "localhost",
  "fintrack-hydra-pro.firebaseapp.com",
  "fintrack-hydra-pro.web.app",
  "hydra-fintrack.vercel.app",
  "fintrack-pi-puce.vercel.app",
  "fintrack-pratikbalis-projects.vercel.app",
  "fintrack-pratikbali-pratikbalis-projects.vercel.app",
  "fintrack-7he2wvhw4-pratikbalis-projects.vercel.app",
];

const current = await getAuthDomains(PROJECT);
const merged = [...new Set([...current, ...REQUIRED])].sort();
if (merged.length !== current.length || REQUIRED.some((d) => !current.includes(d))) {
  await updateAuthDomains(PROJECT, merged);
  console.log("Updated authorized domains:", merged.join(", "));
} else {
  console.log("Authorized domains already up to date:", current.join(", "));
}
