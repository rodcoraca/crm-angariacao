const builderRegistry = new Map();

function registerProvider(providerCode, builderFn) {
  builderRegistry.set(String(providerCode).toLowerCase(), builderFn);
}

function build(provider, config = {}) {
  const builderFn = builderRegistry.get(String(provider).toLowerCase());
  if (!builderFn) {
    throw new Error(`ProviderSearchBuilder: no builder registered for "${provider}".`);
  }
  return builderFn(config);
}

export const ProviderSearchBuilder = { registerProvider, build };
