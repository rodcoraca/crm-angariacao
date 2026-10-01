export const DEFAULT_DASHBOARD_FILTERS = {
  busca: "",
  filtroTipo: "",
  filtroStatus: "",
  filtroUtilizador: ""
};

export function getDashboardFiltersStorageKey({ empresaId, userId }) {
  const safeEmpresaId = String(empresaId ?? "empresa").trim() || "empresa";
  const safeUserId = String(userId ?? "usuario").trim() || "usuario";
  return `osflow.leads.dashboard.filters.${safeEmpresaId}.${safeUserId}`;
}

export function readDashboardFilters({ empresaId, userId, fallback = DEFAULT_DASHBOARD_FILTERS } = {}) {
  if (typeof window === "undefined") {
    return { ...DEFAULT_DASHBOARD_FILTERS, ...fallback };
  }

  const storageKey = getDashboardFiltersStorageKey({ empresaId, userId });
  const rawValue = window.sessionStorage.getItem(storageKey);

  if (!rawValue) {
    return { ...DEFAULT_DASHBOARD_FILTERS, ...fallback };
  }

  try {
    const parsed = JSON.parse(rawValue);
    return {
      ...DEFAULT_DASHBOARD_FILTERS,
      ...fallback,
      ...(parsed && typeof parsed === "object" ? parsed : {})
    };
  } catch (error) {
    return { ...DEFAULT_DASHBOARD_FILTERS, ...fallback };
  }
}

export function writeDashboardFilters({ empresaId, userId, filters = DEFAULT_DASHBOARD_FILTERS }) {
  if (typeof window === "undefined") return;

  const storageKey = getDashboardFiltersStorageKey({ empresaId, userId });
  const normalised = {
    busca: filters?.busca ?? "",
    filtroTipo: filters?.filtroTipo ?? "",
    filtroStatus: filters?.filtroStatus ?? "",
    filtroUtilizador: filters?.filtroUtilizador ?? ""
  };

  window.sessionStorage.setItem(storageKey, JSON.stringify(normalised));
  return normalised;
}

export function toggleLeadSelection(selectedIds = [], leadId) {
  if (!leadId && leadId !== 0) return selectedIds;

  const next = new Set(selectedIds);
  if (next.has(leadId)) {
    next.delete(leadId);
  } else {
    next.add(leadId);
  }

  return Array.from(next);
}

export function isAllFilteredLeadsSelected(rows = [], selectedIds = []) {
  if (!rows.length) return false;
  const selectedSet = new Set(selectedIds);
  return rows.every((lead) => selectedSet.has(lead?.id));
}
