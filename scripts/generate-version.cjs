const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const buildDirectory = path.join(projectRoot, "build");

function getGitCommit() {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();

    return /^[0-9a-f]{7,64}$/i.test(commit) ? commit : null;
  } catch {
    return null;
  }
}

const version = getGitCommit() || `build-${new Date().toISOString().replace(/[-:.]/g, "")}`;
const outputPath = path.join(buildDirectory, "version.json");

fs.writeFileSync(outputPath, `${JSON.stringify({ version }, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(projectRoot, outputPath)} (${version})`);