import { useCallback, useEffect, useRef, useState } from "react";
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
  const importingIdsRef = useRef(new Set());
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const reload = useCallback(async ({ page: _page, pageSize: _pageSize, filters: _filters, sort: _sort } = {}) => {
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

    const targetId = String(target.id || "");
    if (importingIdsRef.current.has(targetId)) {
      return { ok: false, processing: true, message: "Este Lead já está a ser processado." };
    }

    importingIdsRef.current.add(targetId);
    setImportingId(target.id || null);
    try {
      const service = getRadarService();
      return await service.importOpportunityToLeads(target, user);
    } finally {
      importingIdsRef.current.delete(targetId);
      setImportingId(null);
    }
  }, [selectedOpportunity]);

  const updateOpportunityMaintenance = useCallback(async ({ opportunityId, action, user, reason }) => {
    const service = getRadarService();
    const result = action === "professional"
      ? await service.updateProfessionalClassification(opportunityId, user, reason)
      : await service.deactivateOpportunity(opportunityId, user, reason);

    if (result?.ok && result?.opportunity) {
      const updated = result.opportunity;
      setSnapshot((currentSnapshot) => {
        if (!currentSnapshot) return currentSnapshot;

        if (action === "inactive") {
          const remove = (item) => String(item?.id) !== String(updated.id);
          const nextSummary = currentSnapshot.summary
            ? {
              ...currentSnapshot.summary,
              monitorizadas: Math.max(0, Number(currentSnapshot.summary.monitorizadas || 0) - 1),
              novas: updated.is_new && !updated.imported
                ? Math.max(0, Number(currentSnapshot.summary.novas || 0) - 1)
                : currentSnapshot.summary.novas,
              importadas: updated.imported
                ? Math.max(0, Number(currentSnapshot.summary.importadas || 0) - 1)
                : currentSnapshot.summary.importadas
            }
            : currentSnapshot.summary;
          const nextTotal = Math.max(0, Number(currentSnapshot.pagination?.total || 0) - 1);
          const nextPageSize = Number(currentSnapshot.pagination?.pageSize || 20);

          return {
            ...currentSnapshot,
            opportunities: (currentSnapshot.opportunities || []).filter(remove),
            rows: (currentSnapshot.rows || []).filter(remove),
            table: (currentSnapshot.table || []).filter((item) => String(item?.id) !== String(updated.id)),
            pagination: currentSnapshot.pagination
              ? {
                ...currentSnapshot.pagination,
                total: nextTotal,
                totalPages: nextPageSize > 0 ? Math.max(1, Math.ceil(nextTotal / nextPageSize)) : 1
              }
              : currentSnapshot.pagination,
            summary: nextSummary,
            kpis: currentSnapshot.kpis
              ? currentSnapshot.kpis.map((kpi) => {
                if (kpi.id === "kpi-monitorizadas") return { ...kpi, valor: String(nextSummary?.monitorizadas ?? kpi.valor) };
                if (kpi.id === "kpi-novas") return { ...kpi, valor: String(nextSummary?.novas ?? kpi.valor) };
                if (kpi.id === "kpi-importadas") return { ...kpi, valor: String(nextSummary?.importadas ?? kpi.valor) };
                return kpi;
              })
              : currentSnapshot.kpis
          };
        }

        const replace = (item) => String(item?.id) === String(updated.id) ? updated : item;
        return {
          ...currentSnapshot,
          opportunities: (currentSnapshot.opportunities || []).map(replace),
          rows: (currentSnapshot.rows || []).map(replace),
          table: (currentSnapshot.table || []).map((item) => (
            String(item?.id) === String(updated.id)
              ? { ...item, estado: updated.is_inactive ? "Anúncio Inativo" : item.estado, rawOpportunity: updated }
              : item
          ))
        };
      });

      setSelectedOpportunity((current) => {
        if (!current || String(current.id) !== String(updated.id)) return current;
        return action === "inactive" ? null : updated;
      });
    }

    return result;
  }, []);

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
    updateOpportunityMaintenance,
    page,
    pageSize,
    setPage
  };
}
