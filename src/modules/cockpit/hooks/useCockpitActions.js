import { useCallback, useEffect, useState } from "react";
import { fetchAcoesImediatas } from "../services";
import { mapCockpitActionsData } from "../viewmodels/cockpitActionsViewModel";

export function useCockpitActions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const raw = await fetchAcoesImediatas();
      setData(mapCockpitActionsData(raw));
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
        const raw = await fetchAcoesImediatas();
        if (!isMounted) return;
        setData(mapCockpitActionsData(raw));
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
