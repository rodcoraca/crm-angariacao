const fs = require("fs");
const path = require("path");
const packageJson = require(path.join(process.cwd(), "package.json"));

const buildId = `${packageJson.version}-${Date.now()}`;
const version = {
  app: "OSFlow",
  version: packageJson.version,
  buildId,
  generatedAt: new Date().toISOString(),
  forceUpdate: process.env.OSFLOW_FORCE_UPDATE === "true"
};

const buildDir = path.join(process.cwd(), "build");
fs.writeFileSync(path.join(buildDir, "version.json"), `${JSON.stringify(version, null, 2)}\n`, "utf8");
console.log(`[OSFlow] Generated build version ${buildId}`);
