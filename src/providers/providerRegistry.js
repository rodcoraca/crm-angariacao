import ImovirtualProvider from "./ImovirtualProvider.js";

export const PROVIDERS = {
  imovirtual: ImovirtualProvider,
  idealista: null,
  olx: null
};

export function getProvider(providerCode) {
  return PROVIDERS[providerCode] || null;
}