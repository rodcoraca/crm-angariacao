/**
 * Teste manual do ImovirtualProvider experimental.
 * Não persiste, processa ou extrai conteúdo do HTML recebido.
 */
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

function loadProvider() {
  const providerPath = path.resolve(__dirname, "../src/providers/ImovirtualProvider.js");
  const source = fs.readFileSync(providerPath, "utf8");
  const { code } = babel.transformSync(source, {
    filename: providerPath,
    presets: [["@babel/preset-env", { modules: "commonjs" }]]
  });
  const module = { exports: {} };
  new Function("exports", "module", code)(module.exports, module);
  return module.exports;
}

function logFetchError(error) {
  console.log("error.message:", error.message);
  console.log("error.name:", error.name);
  console.log("error.stack:", error.stack);
  console.log("error.cause:", error.cause);
}

function findScriptBlock(html, predicate) {
  const scripts = html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    if (predicate(match[0], match[1])) return match[1];
  }
  return null;
}

function inspectHtmlBlocks(html) {
  return {
    NEXT_DATA: findScriptBlock(html, (tag) => /id=["']__NEXT_DATA__["']/i.test(tag)),
    INITIAL_STATE: findScriptBlock(html, (_tag, content) => /window\.__INITIAL_STATE__/i.test(content)),
    LD_JSON: findScriptBlock(html, (tag) => /type=["']application\/ld\+json["']/i.test(tag)),
    apollo: findScriptBlock(html, (_tag, content) => /apollo/i.test(content))
  };
}

async function run() {
  let html = "";
  try {
    const { default: ImovirtualProvider } = loadProvider();
    const provider = new ImovirtualProvider();
    const nativeFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      console.log("URL final utilizada:", String(url));
      console.log("Node version:", process.version);
      try {
        return await nativeFetch(url, options);
      } catch (error) {
        logFetchError(error);
        throw error;
      }
    };
    const fetchSearchPage = provider.fetchSearchPage.bind(provider);
    provider.fetchSearchPage = async (params) => {
      const response = await fetchSearchPage(params);
      html = response.html;
      return response;
    };

    const result = await provider.testConnection({ district: "porto", page: 1 });

    console.log(JSON.stringify(result, null, 2));
    if (result.success) {
      const debugDirectory = path.resolve(__dirname, "../debug");
      const debugFile = path.join(debugDirectory, "imovirtual.html");
      fs.mkdirSync(debugDirectory, { recursive: true });
      fs.writeFileSync(debugFile, html, "utf8");

      console.log("HTML guardado em:", debugFile);
      const blocks = inspectHtmlBlocks(html);
      Object.entries(blocks).forEach(([name, block]) => {
        console.log(`\n${name}:`, { found: Boolean(block), blockLength: block?.length || 0 });
        if (block) console.log(block.slice(0, 1000));
      });
    }

    if (!result.success) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message || String(error),
      statusCode: error.statusCode || null
    }, null, 2));
    process.exitCode = 1;
  }
}

run();
