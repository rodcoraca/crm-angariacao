import ImovirtualProvider from "./ImovirtualProvider.js";

export const PROVIDERS = {
  imovirtual: ImovirtualProvider
};

export function getProvider(providerCode) {
  return PROVIDERS[providerCode] || null;
}