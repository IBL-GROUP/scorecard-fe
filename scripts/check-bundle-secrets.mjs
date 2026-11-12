// Story S5, TC-S5-15: no keys or secrets in the browser bundle.
//
//   node scripts/check-bundle-secrets.mjs [dist-folder ...]     (default: dist)
//
// 1. Looks for secret-shaped text: private keys, service-account JSON fields,
//    Google API keys and OAuth tokens, server-side variable names.
// 2. Compares the bundle with the real secrets the back ends use
//    (scorecard-be JWT_ACCESS_SECRET; the BigQuery service-account key), if
//    those files are on this machine. Their values are read only to compare and
//    are never printed.
// 3. Flags source maps (.map), which would publish the source code.
// Exits 1 on any finding.
import fs from "fs";
import path from "path";

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ["dist"];
const BE_ENV = process.env.SCORECARD_BE_ENV ?? path.resolve("../scorecard-be/.env");
const BQ_ENV = process.env.BQ_ENV_FILE ?? path.resolve("../Version 2/DSR-test-be/.env");

const PATTERNS = [
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["service-account JSON field", /"(private_key|private_key_id|client_email)"\s*:/],
  ["Google API key", /AIza[0-9A-Za-z_-]{35}/],
  ["Google OAuth access token", /ya29\.[0-9A-Za-z_-]{20,}/],
  ["server-side variable name", /\b(JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|GCP_SERVICE_ACCOUNT_BASE64|GOOGLE_APPLICATION_CREDENTIALS|DB_PASSWORD|PGPASSWORD)\b/],
  ["database URL with password", /postgres(ql)?:\/\/[^:\s"']+:[^@\s"']+@/],
];

function envValue(file, key) {
  try {
    const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

/** Secret values to look for, by label. Never printed. */
const secrets = [];
const jwtSecret = envValue(BE_ENV, "JWT_ACCESS_SECRET");
if (jwtSecret && jwtSecret.length >= 8) secrets.push(["scorecard-be JWT_ACCESS_SECRET", jwtSecret]);
const saB64 = envValue(BQ_ENV, "GCP_SERVICE_ACCOUNT_BASE64");
if (saB64) {
  try {
    const sa = JSON.parse(Buffer.from(saB64, "base64").toString("utf8"));
    if (sa.private_key_id) secrets.push(["BigQuery service-account private_key_id", sa.private_key_id]);
    if (sa.private_key) secrets.push(["BigQuery service-account private key (body)", sa.private_key.split("\n").slice(1, 2).join("")]);
    secrets.push(["BigQuery service-account key (base64)", saB64.slice(0, 64)]);
  } catch {
    /* unreadable: skip */
  }
}

const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const findings = [];
let scanned = 0;
for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    findings.push(`${dir}: folder not found (build first)`);
    continue;
  }
  for (const f of files(dir)) {
    if (f.endsWith(".map")) findings.push(`${f}: source map shipped`);
    if (!/\.(js|mjs|css|html|json|txt|webmanifest)$/.test(f)) continue;
    const text = fs.readFileSync(f, "utf8");
    scanned++;
    for (const [label, re] of PATTERNS) if (re.test(text)) findings.push(`${f}: ${label}`);
    for (const [label, value] of secrets) if (text.includes(value)) findings.push(`${f}: contains the ${label}`);
  }
}

console.log(`Scanned ${scanned} files in ${dirs.join(", ")} · ${PATTERNS.length} patterns · ${secrets.length} known secret values compared (not printed)`);
if (findings.length) {
  console.log(`FAIL: ${findings.length} finding(s)`);
  for (const f of findings) console.log(`  - ${f}`);
  process.exitCode = 1;
} else console.log("PASS: no keys or secrets found");
