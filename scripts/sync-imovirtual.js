const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const moduleCache = new Map();

function resolveLocalModule(request, parentFile) {
  const resolved = path.resolve(path.dirname(parentFile), request);
  if (fs.existsSync(`${resolved}.js`)) return `${resolved}.js`;
  if (fs.existsSync(path.join(resolved, "index.js"))) return path.join(resolved, "index.js");
  return resolved;
}

function loadModule(filePath) {
  if (moduleCache.has(filePath)) return moduleCache.get(filePath).exports;

  const module = { exports: {} };
  moduleCache.set(filePath, module);
  const source = fs.readFileSync(filePath, "utf8");
  const { code } = babel.transformSync(source, {
    filename: filePath,
    presets: [["@babel/preset-env", { modules: "commonjs" }]]
  });
  const localRequire = (request) => (
    request.startsWith(".") ? loadModule(resolveLocalModule(request, filePath)) : require(request)
  );
  new Function("exports", "module", "require", code)(module.exports, module, localRequire);
  return module.exports;
}

async function run() {
  const providerPath = path.resolve(__dirname, "../src/providers/ImovirtualProvider.js");
  const { default: ImovirtualProvider } = loadModule(providerPath);
  const provider = new ImovirtualProvider({ enableLogs: true });
  const result = await provider.sync();

  console.log(JSON.stringify({
    totalListings: result.discovered,
    totalPrivateOwners: result.privateOwners,
    totalNew: result.created,
    totalSkipped: result.skipped,
    errors: result.errors,
    firstFive: result.listings.slice(0, 5)
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
