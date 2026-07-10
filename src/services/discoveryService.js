import ImovirtualProvider from "../providers/ImovirtualProvider";

const defaultProviders = [new ImovirtualProvider()];

/** Scheduler futuro: invocar runAll(), sem agendamento neste módulo. */
export async function runProvider(provider) {
  if (!provider || typeof provider.sync !== "function") {
    return { data: null, error: new Error("Provider inválido: o método sync() é obrigatório.") };
  }
  try {
    return { data: await provider.sync(), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function runAll(providers = defaultProviders) {
  const results = await Promise.all(providers.map((provider) => runProvider(provider)));
  const errors = results.map((result) => result.error).filter(Boolean);
  return { data: results.map((result) => result.data).filter(Boolean), error: errors[0] || null, results };
}
