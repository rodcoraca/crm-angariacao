import { ProviderSearchBuilder } from "./ProviderSearchBuilder.js";
import { buildOlxSearchDefinitions } from "../../shared/provider-engine/olx/searchDefinitions.js";

export function buildOlxSearchUrls({ categories = [] } = {}) {
  return buildOlxSearchDefinitions(categories).definitions.map((definition) => definition.searchUrl);
}

ProviderSearchBuilder.registerProvider("olx", buildOlxSearchUrls);
