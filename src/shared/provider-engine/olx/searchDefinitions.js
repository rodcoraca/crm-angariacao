import { normalizeOlxCategoryUrl } from "./categoryDiscovery.js";

function createMetrics(categoriesReceived) {
  return {
    categoriesReceived,
    definitionsCreated: 0,
    duplicatesRemoved: 0,
    invalidCategoriesIgnored: 0
  };
}

export function buildOlxSearchDefinitions(categories) {
  const received = Array.isArray(categories) ? categories : [];
  const metrics = createMetrics(received.length);
  const definitions = [];
  const searchUrls = new Set();

  for (const category of received) {
    const searchUrl = normalizeOlxCategoryUrl(category?.url);
    if (!searchUrl) {
      metrics.invalidCategoriesIgnored += 1;
      continue;
    }

    if (searchUrls.has(searchUrl)) {
      metrics.duplicatesRemoved += 1;
      continue;
    }

    searchUrls.add(searchUrl);
    definitions.push({
      provider: "olx",
      categoryName: typeof category.name === "string" && category.name.trim() ? category.name.trim() : null,
      categoryUrl: searchUrl,
      searchUrl,
      type: "category"
    });
  }

  metrics.definitionsCreated = definitions.length;
  return { definitions, metrics };
}