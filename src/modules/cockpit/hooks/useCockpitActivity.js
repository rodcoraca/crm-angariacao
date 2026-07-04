import { useCallback, useEffect, useState } from "react";
import { fetchUltimasAtividades } from "../services";

export function useCockpitActivity(ultimasAtividadesBase) {
  const [data, setData] = useState(() => fetchUltimasAtividades(ultimasAtividadesBase));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const items = await Promise.resolve(fetchUltimasAtividades(ultimasAtividadesBase));
      setData(items);
    } catch {
      setError(true);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [ultimasAtividadesBase]);

  useEffect(() => {
    setData(fetchUltimasAtividades(ultimasAtividadesBase));
  }, [ultimasAtividadesBase]);

  return {
    data,
    loading,
    error,
    refresh
  };
}
