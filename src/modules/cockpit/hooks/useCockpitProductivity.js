import { useCallback, useMemo, useState } from "react";
import { fetchProdutividade } from "../services";

export function useCockpitProductivity(produtividadeBase) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const data = useMemo(() => fetchProdutividade(produtividadeBase), [produtividadeBase]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      await Promise.resolve(fetchProdutividade(produtividadeBase));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [produtividadeBase]);

  return {
    data,
    loading,
    error,
    refresh
  };
}
