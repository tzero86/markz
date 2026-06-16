// Extracts the CHANGELOG.md section for the Git tag being built and writes it
// to $GITHUB_OUTPUT as a multi-line `body` value for tauri-action's releaseBody.
// Falls back to a generic message if no matching section is found.

const fs = require("fs");
const path = require("path");

const tag = process.env.TAG || "";
const version = tag.replace(/^v/, "");
const changelogPath = path.join(process.cwd(), "CHANGELOG.md");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!version) {
  fail("TAG environment variable is required (e.g. v0.8.51)");
}

let changelog;
try {
  changelog = fs.readFileSync(changelogPath, "utf8");
} catch (e) {
  fail(`Could not read CHANGELOG.md: ${e.message}`);
}

const fallback = "See the assets to download this version and install.";
const lines = changelog.split(/\r?\n/);
const headerIndex = lines.findIndex((line) =>
  line.trim().startsWith(`## [${version}]`)
);

let body;
if (headerIndex === -1) {
  console.log(
    `::warning::No CHANGELOG section found for ${version}; using fallback release body.`
  );
  body = fallback;
} else {
  const bodyLines = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith("## [")) break;
    bodyLines.push(lines[i]);
  }
  // Trim leading/trailing blank lines while preserving internal formatting.
  while (bodyLines.length && bodyLines[0].trim() === "") bodyLines.shift();
  while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === "")
    bodyLines.pop();
  body = bodyLines.join("\n") || fallback;
}

const output = process.env.GITHUB_OUTPUT;
if (!output) {
  // Local/debug run: print to stdout.
  console.log(body);
  process.exit(0);
}

// GitHub Actions multi-line output uses a heredoc delimiter.
const delimiter = "CHANGELOG_EOF";
fs.appendFileSync(output, `body<<${delimiter}\n${body}\n${delimiter}\n`);
