import { useCallback, useEffect, useState } from "react";
import { fetchAgendaOperacional } from "../services";
import { mapCockpitAgendaData } from "../viewmodels/cockpitAgendaViewModel";

export function useCockpitAgenda() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const raw = await fetchAgendaOperacional();
      setData(mapCockpitAgendaData(raw));
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
        const raw = await fetchAgendaOperacional();
        if (!isMounted) return;
        setData(mapCockpitAgendaData(raw));
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
