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
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const reload = useCallback(async ({ page: _page, pageSize: _pageSize, filters: _filters, sort: _sort } = {}) => {
    console.log("[Radar Hook] reload recebeu | page:", _page, "| pageSize:", _pageSize);
    setLoading(true);
    setError(null);

    try {
      clearRadarDataProvider();
      const data = await fetchRadarSnapshot({ page: _page, pageSize: _pageSize, filters: _filters, sort: _sort });
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
      return await service.importOpportunityToLeads(target, user);
    } finally {
      setImportingId(null);
    }
  }, [selectedOpportunity]);

  const updateOpportunityState = useCallback(async ({ opportunityId, nextState }) => {
    const service = getRadarService();
    const result = await service.updateOpportunityState(opportunityId, nextState);

    if (result?.ok && result?.snapshot) {
      setSnapshot(result.snapshot);

      if (selectedOpportunity?.id) {
        const refreshed = (result.snapshot.opportunities || []).find(
          (item) => String(item?.id) === String(selectedOpportunity.id)
        );
        setSelectedOpportunity(refreshed || null);
      }
    }

    return result;
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
    importSelectedToLeads,
    updateOpportunityState,
    page,
    pageSize,
    setPage
  };
}
