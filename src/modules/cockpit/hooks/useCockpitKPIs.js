import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchKpiValues } from "../services";
import {
  COCKPIT_KPI_ERROR_VALUES,
  COCKPIT_KPI_PLACEHOLDER_VALUES,
  mapCockpitKpiData,
  normalizeCockpitKpiValues
} from "../viewmodels/cockpitKpiViewModel";

export function useCockpitKPIs(kpisBase) {
  const [kpiValues, setKpiValues] = useState(COCKPIT_KPI_PLACEHOLDER_VALUES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const data = useMemo(
    () => mapCockpitKpiData(kpisBase, kpiValues, error),
    [kpisBase, kpiValues, error]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const values = await fetchKpiValues();
      setKpiValues(normalizeCockpitKpiValues(values));
    } catch {
      setError(true);
      setKpiValues(COCKPIT_KPI_ERROR_VALUES);
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
        const values = await fetchKpiValues();
        if (!isMounted) return;
        setKpiValues(normalizeCockpitKpiValues(values));
      } catch {
        if (!isMounted) return;
        setError(true);
        setKpiValues(COCKPIT_KPI_ERROR_VALUES);
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
