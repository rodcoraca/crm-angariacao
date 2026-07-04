import { useCallback, useEffect, useState } from "react";
import { fetchImoveisSaude } from "../services";
import { mapCockpitRiskData } from "../viewmodels/cockpitRiskViewModel";

export function useCockpitRisk() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const raw = await fetchImoveisSaude();
      setData(mapCockpitRiskData(raw));
    } catch {
      setError(true);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setLoading(true);
      setError(false);

      try {
        const raw = await fetchImoveisSaude();
        if (!isMounted) return;
        setData(mapCockpitRiskData(raw));
      } catch {
        if (!isMounted) return;
        setError(true);
        setData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh
  };
}
