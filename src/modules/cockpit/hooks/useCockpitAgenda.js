import { useCallback, useEffect, useState } from "react";
import { fetchAgendaOperacional } from "../services";
import { mapCockpitAgendaData, mapCockpitFutureAgendaData } from "../viewmodels/cockpitAgendaViewModel";

export function useCockpitAgenda(user = null) {
  const [data, setData] = useState([]);
  const [futureData, setFutureData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const raw = await fetchAgendaOperacional(user);
      setData(mapCockpitAgendaData(raw));
      setFutureData(mapCockpitFutureAgendaData(raw));
    } catch {
      setError(true);
      setData([]);
      setFutureData([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setLoading(true);
      setError(false);

      try {
        const raw = await fetchAgendaOperacional(user);
        if (!isMounted) return;
        setData(mapCockpitAgendaData(raw));
        setFutureData(mapCockpitFutureAgendaData(raw));
      } catch {
        if (!isMounted) return;
        setError(true);
        setData([]);
        setFutureData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return {
    data,
    futureData,
    loading,
    error,
    refresh
  };
}
