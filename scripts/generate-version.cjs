const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

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
const reactScripts = path.join(projectRoot, "node_modules", "react-scripts", "bin", "react-scripts.js");

if (!fs.existsSync(reactScripts)) {
  console.error("react-scripts não encontrado. Execute npm install antes do build.");
  process.exit(1);
}

// Injeta no bundle exatamente a mesma versão que será publicada em /version.json.
const build = spawnSync(process.execPath, [reactScripts, "build"], {
  cwd: projectRoot,
  env: { ...process.env, REACT_APP_BUILD_VERSION: version },
  stdio: "inherit"
});

if (build.error) {
  console.error(build.error);
  process.exit(1);
}
if (build.status !== 0) {
  process.exit(build.status || 1);
}

const buildDirectory = path.join(projectRoot, "build");
const outputPath = path.join(buildDirectory, "version.json");
fs.writeFileSync(outputPath, `${JSON.stringify({ version }, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(projectRoot, outputPath)} (${version})`);
