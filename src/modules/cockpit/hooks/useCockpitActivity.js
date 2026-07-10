import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchUltimasAtividades } from "../services";

export function useCockpitActivity(ultimasAtividadesBase) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const data = useMemo(() => fetchUltimasAtividades(ultimasAtividadesBase), [ultimasAtividadesBase]);

  useEffect(() => {
    console.log("loop source", "useCockpitActivity");
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      await Promise.resolve(fetchUltimasAtividades(ultimasAtividadesBase));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [ultimasAtividadesBase]);

  return {
    data,
    loading,
    error,
    refresh
  };
}
