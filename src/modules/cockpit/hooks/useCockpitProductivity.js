import { useCallback, useEffect, useState } from "react";
import { fetchProdutividade } from "../services";

export function useCockpitProductivity(produtividadeBase) {
  const [data, setData] = useState(() => fetchProdutividade(produtividadeBase));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const items = await Promise.resolve(fetchProdutividade(produtividadeBase));
      setData(items);
    } catch {
      setError(true);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [produtividadeBase]);

  useEffect(() => {
    setData(fetchProdutividade(produtividadeBase));
  }, [produtividadeBase]);

  return {
    data,
    loading,
    error,
    refresh
  };
}
