import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPipelineValues } from "../services";
import {
  COCKPIT_PIPELINE_ERROR_VALUES,
  COCKPIT_PIPELINE_PLACEHOLDER_VALUES,
  mapCockpitPipelineData,
  normalizeCockpitPipelineValues
} from "../viewmodels/cockpitPipelineViewModel";

export function useCockpitPipeline(pipelineBase) {
  const [pipelineValues, setPipelineValues] = useState(COCKPIT_PIPELINE_PLACEHOLDER_VALUES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const data = useMemo(
    () => mapCockpitPipelineData(pipelineBase, pipelineValues, error),
    [pipelineBase, pipelineValues, error]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const values = await fetchPipelineValues();
      setPipelineValues(normalizeCockpitPipelineValues(values));
    } catch {
      setError(true);
      setPipelineValues(COCKPIT_PIPELINE_ERROR_VALUES);
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
        const values = await fetchPipelineValues();
        if (!isMounted) return;
        setPipelineValues(normalizeCockpitPipelineValues(values));
      } catch {
        if (!isMounted) return;
        setError(true);
        setPipelineValues(COCKPIT_PIPELINE_ERROR_VALUES);
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
