import { useCallback, useEffect, useState } from "react";
import {
  clearRadarDataProvider,
  fetchRadarSnapshot,
  getRadarService
} from "../services/radarService";

export function useRadar() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [importingId, setImportingId] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Garantia de demo: o Radar opera exclusivamente com MockRadarProvider.
      clearRadarDataProvider();
      const data = await fetchRadarSnapshot();
      setSnapshot(data);
    } catch (err) {
      setError(err);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openDetail = useCallback((opportunity) => {
    setSelectedOpportunity(opportunity || null);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedOpportunity(null);
  }, []);

  const importSelectedToLeads = useCallback(async ({ opportunity, user }) => {
    const target = opportunity || selectedOpportunity;
    if (!target) {
      return {
        ok: false,
        message: "Selecione uma oportunidade para importar."
      };
    }

    setImportingId(target.id || null);
    try {
      const service = getRadarService();
      const result = await service.importOpportunityToLeads(target, user);
      return result;
    } finally {
      setImportingId(null);
    }
  }, [selectedOpportunity]);

  return {
    snapshot,
    loading,
    error,
    reload,
    selectedOpportunity,
    importingId,
    openDetail,
    closeDetail,
    importSelectedToLeads
  };
}
