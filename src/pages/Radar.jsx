import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useAuthContext } from "../modules/auth/context";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import KpiCard from "../components/ui/KpiCard";
import Table from "../components/ui/Table";
import Loading from "../components/ui/Loading";
import { notifyError, notifyInfo, notifySuccess } from "../components/ui/feedbackBus";
import imovirtualLogo from "../assets/imovirtual.jpg";
import custojustoLogo from "../assets/custojusto.jpg";
import {
  useRadar,
  mapRadarFlowViewModel,
  mapRadarKpisViewModel,
  mapRadarRoadmapViewModel,
  mapRadarTableViewModel
} from "../modules/radar";
import { createRadarStyles } from "./radarStyles";
import { runImovirtualSync } from "../providers/services/providers/providerSyncRunner";
import SyncProgressModal from "../components/radar/SyncProgressModal";
import SyncPreparationModal from "../components/radar/SyncPreparationModal";
import { getProviderSyncStatus } from "../providers/services/providers/providerSyncService";
import { providerSyncEngine, SyncState } from "../shared/provider-engine/sync/ProviderSyncEngine";
import { useNavigationGuard } from "../shared/navigation";
import { formatDateTime, formatPublishedDate } from "../modules/radar/utils/radarUtils";

const PROVIDER_LOGOS = {
  imovirtual: imovirtualLogo,
  custojusto: custojustoLogo
};

function getProviderLogo(providerValue) {
  const normalized = String(providerValue || "").trim().toLowerCase();
  return PROVIDER_LOGOS[normalized] || null;
}

function getProviderLabel(providerValue) {
  const normalized = String(providerValue || "").trim().toLowerCase();
  if (normalized.includes("imovirtual")) return "Imovirtual";
  if (normalized.includes("custojusto")) return "CustoJusto";
  const text = String(providerValue || "").trim();
  return text || "Desconhecido";
}

function buildSQLFilters({
  filtroCidade,
  filtroEstado,
  filtroOrigem,
  filtroDistrito,
  filtroParticulares,
  filtroData,
  filtroTipologia,
  filtroPrecoMin,
  filtroPrecoMax
}) {
  const f = {};
  const normalizedProvider = String(filtroOrigem || "").trim().toLowerCase();

  if (filtroCidade && String(filtroCidade).trim()) f.city = String(filtroCidade).trim();
  if (filtroDistrito && filtroDistrito !== "todos") f.district = filtroDistrito;
  if (normalizedProvider && normalizedProvider !== "todos") f.provider = normalizedProvider;
  if (filtroEstado && filtroEstado !== "todos") f.estado = filtroEstado;
  if (filtroParticulares === "particulares") f.is_private_owner = true;
  else if (filtroParticulares === "nao_particulares") f.is_private_owner = false;
  if (filtroTipologia && String(filtroTipologia).trim() && String(filtroTipologia).trim() !== "todos") {
    f.tipologia = String(filtroTipologia).trim();
  }

  const precoMin = String(filtroPrecoMin ?? "").trim();
  if (precoMin && !Number.isNaN(Number(precoMin))) {
    f.min_price = String(Number(precoMin));
  }

  const precoMax = String(filtroPrecoMax ?? "").trim();
  if (precoMax && !Number.isNaN(Number(precoMax))) {
    f.max_price = String(Number(precoMax));
  }

  const agora = new Date();
  if (filtroData === "24h") f.date_after = new Date(agora - 24 * 60 * 60 * 1000).toISOString();
  else if (filtroData === "7d") f.date_after = new Date(agora - 7 * 24 * 60 * 60 * 1000).toISOString();
  else if (filtroData === "15d") f.date_after = new Date(agora - 15 * 24 * 60 * 60 * 1000).toISOString();
  else if (filtroData === "30d_plus") f.date_before = new Date(agora - 30 * 24 * 60 * 60 * 1000).toISOString();
  return f;
}

function getVisiblePageNumbers(currentPage, totalPages) {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const safeCurrent = Math.min(Math.max(1, Number(currentPage) || 1), safeTotal);

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  const pages = new Set([1, safeCurrent, safeTotal, safeCurrent - 1, safeCurrent - 2, safeCurrent + 1, safeCurrent + 2]);
  const nextPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= safeTotal)
    .sort((a, b) => a - b);

  const compact = [];
  for (let i = 0; i < nextPages.length; i += 1) {
    const page = nextPages[i];
    const previous = nextPages[i - 1];
    const next = nextPages[i + 1];

    if (previous !== undefined && page - previous > 1) {
      compact.push("ellipsis");
    }

    compact.push(page);

    if (next !== undefined && next - page > 1) {
      compact.push("ellipsis");
    }
  }

  return compact;
}

function PaginationControls({ currentPage, totalPages, onPageChange, compact = true }) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), safeTotalPages);
  const visiblePages = getVisiblePageNumbers(safeCurrentPage, safeTotalPages);
  const buttonStyle = { whiteSpace: "nowrap", minWidth: "120px" };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
      <Button
        variant="ghost"
        style={buttonStyle}
        disabled={safeCurrentPage === 1}
        onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
      >
        ← Anterior
      </Button>

      {visiblePages.map((pageOrEllipsis, index) => {
        if (pageOrEllipsis === "ellipsis") {
          return (
            <span key={`ellipsis-${index}`} style={{ padding: "0 4px", color: "#6b7280" }}>
              ...
            </span>
          );
        }

        const pageNumber = Number(pageOrEllipsis);
        const isActive = pageNumber === safeCurrentPage;

        return (
          <Button
            key={`page-${pageNumber}`}
            variant={isActive ? "primary" : "ghost"}
            style={{
              minWidth: "36px",
              padding: "0 10px",
              borderRadius: 6,
              fontWeight: isActive ? 700 : 500,
              background: isActive ? "#0d2c4d" : undefined,
              color: isActive ? "#fff" : undefined
            }}
            onClick={() => {
              if (pageNumber === safeCurrentPage) return;
              onPageChange(pageNumber);
            }}
          >
            {pageNumber}
          </Button>
        );
      })}

      <Button
        variant="ghost"
        style={buttonStyle}
        disabled={safeCurrentPage >= safeTotalPages}
        onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
      >
        Seguinte →
      </Button>
    </div>
  );
}

export default function Radar() {
  const tableRef = useRef(null);
  const detailRef = useRef(null);
  const opportunityRowRefs = useRef(new Map());
  const lastOpenedOpportunityIdRef = useRef(null);
  const lastOpenedOpportunityRowRef = useRef(null);
  const paginatingRef = useRef(false);
  const highlightTimeoutRef = useRef(null);
  const theme = useTheme();
  const { user } = useAuthContext();
  const {
    snapshot,
    loading,
    error,
    selectedOpportunity,
    importingId,
    reload,
    openDetail,
    closeDetail: originalCloseDetail,
    importSelectedToLeads,
    updateOpportunityState,
    page,
    pageSize,
    setPage
  } = useRadar();
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState("todos");
  const [filtroDistrito, setFiltroDistrito] = useState("todos");
  const [filtroTipologia, setFiltroTipologia] = useState("");
  const [filtroPrecoMin, setFiltroPrecoMin] = useState("");
  const [filtroPrecoMax, setFiltroPrecoMax] = useState("");
  const [filtroParticulares, setFiltroParticulares] = useState("todos");
  const [filtroData, setFiltroData] = useState("todos");
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(5);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(null);

  const [providerSyncStatus, setProviderSyncStatus] = useState(null);
  const [providerSyncStatuses, setProviderSyncStatuses] = useState({});
  const [providerSyncStatusLoading, setProviderSyncStatusLoading] = useState(true);
  const [remainingMs, setRemainingMs] = useState(0);
  const [syncPreparationOpen, setSyncPreparationOpen] = useState(false);
  const [syncActive, setSyncActive] = useState(false);
  const syncActiveRef = useRef(false);
  const AVAILABLE_PROVIDERS = useMemo(() => ["imovirtual", "custojusto"], []);

  const TIMELINE_PAGE_SIZE = 5;
  const styles = useMemo(() => createRadarStyles(theme), [theme]);
  const nowrapButtonStyle = useMemo(() => ({
    whiteSpace: "nowrap",
    minWidth: "110px",
    padding: "6px 10px",
    fontSize: "0.8rem",
    lineHeight: 1.2
  }), []);
  const nowrapBadgeStyle = useMemo(() => ({
    whiteSpace: "nowrap",
    padding: "4px 8px",
    fontSize: "0.78rem",
    lineHeight: 1.2
  }), []);

  const waitForRenderCommit = useCallback(async () => {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    return;
  }

    await new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    });
  }, []);

  const loadProviderSyncStatus = useCallback(async () => {
    const nextStatuses = {};
    setProviderSyncStatusLoading(true);

    try {
      for (const providerCode of AVAILABLE_PROVIDERS) {
        try {
          const status = await getProviderSyncStatus(providerCode);
          nextStatuses[providerCode] = status || {
            provider_code: providerCode,
            empresa_id: null,
            sync_running: false,
            last_execution: null,
            next_execution: null,
            canSync: false,
            remainingMs: 0,
            statusLabel: "Estado indisponível"
          };
        } catch (error) {
          console.error(`[Radar] Erro ao obter estado da sincronização para ${providerCode}:`, error);
          nextStatuses[providerCode] = {
            provider_code: providerCode,
            empresa_id: null,
            sync_running: false,
            last_execution: null,
            next_execution: null,
            canSync: false,
            remainingMs: 0,
            statusLabel: "Estado indisponível"
          };
        }
      }

      setProviderSyncStatuses(nextStatuses);
      setProviderSyncStatus(Object.values(nextStatuses).find(Boolean) || null);
    } catch (error) {
      console.error("[Radar] Erro ao obter estado da sincronização:", error);
      setProviderSyncStatuses({});
      setProviderSyncStatus(null);
    } finally {
      setProviderSyncStatusLoading(false);
    }
  }, [AVAILABLE_PROVIDERS]);

  useEffect(() => {
    if (!loading) {
      void loadProviderSyncStatus();
    }
  }, [loading, loadProviderSyncStatus]);

  useEffect(() => {
    const refreshStatus = () => {
      if (!loading) {
        void loadProviderSyncStatus();
      }
    };

    window.addEventListener("focus", refreshStatus);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshStatus();
      }
    });

    return () => {
      window.removeEventListener("focus", refreshStatus);
      document.removeEventListener("visibilitychange", refreshStatus);
    };
  }, [loading, loadProviderSyncStatus]);

  useEffect(() => {
    const syncStates = new Set([
      SyncState.PREPARING,
      SyncState.CONNECTING,
      SyncState.FETCHING,
      SyncState.PROCESSING,
      SyncState.SAVING,
      SyncState.FINALIZING
    ]);

    const updateSyncActive = (eventState) => {
      const anyProviderRunning = Object.values(providerSyncStatuses).some((status) => Boolean(status?.sync_running));
      const active = syncStates.has(eventState) || anyProviderRunning;
      syncActiveRef.current = active;
      setSyncActive(active);
    };

    updateSyncActive(providerSyncEngine.state);

    const unsubscribe = providerSyncEngine.subscribe((incoming) => {
      updateSyncActive(incoming.state);
    });

    return () => unsubscribe();
  }, [providerSyncStatuses]);

  useNavigationGuard({
    isEditing: syncActive,
    isEditingNow: () => syncActiveRef.current || Object.values(providerSyncStatuses).some((status) => Boolean(status?.sync_running)),
    onSave: undefined,
    onDiscard: undefined,
    onCancelEditing: undefined,
    markClean: undefined
  });

  const eligibleProviders = useMemo(
    () => AVAILABLE_PROVIDERS.filter((providerCode) => {
      const status = providerSyncStatuses[providerCode];
      return Boolean(status?.canSync) && !status?.sync_running;
    }),
    [AVAILABLE_PROVIDERS, providerSyncStatuses]
  );

  const isProviderSyncRunning = useMemo(
    () => Object.values(providerSyncStatuses).some((status) => Boolean(status?.sync_running)),
    [providerSyncStatuses]
  );

  const canRunAnyProvider = !providerSyncStatusLoading && eligibleProviders.length > 0;

  useEffect(() => {
    if (loading) {
      return;
    }

    const refreshLoop = setInterval(() => {
      void loadProviderSyncStatus();
    }, 5000);

    return () => clearInterval(refreshLoop);
  }, [loading, loadProviderSyncStatus]);

  useEffect(() => {
    const futureLocks = AVAILABLE_PROVIDERS
      .map((providerCode) => providerSyncStatuses[providerCode])
      .filter((status) => status && status.next_execution && !status.sync_running)
      .map((status) => new Date(status.next_execution).getTime() - Date.now())
      .filter((value) => value > 0);

    if (futureLocks.length === 0) {
      setRemainingMs(0);
      return;
    }

    const nextLockMs = Math.min(...futureLocks);
    setRemainingMs(nextLockMs);

    let timer;
    const updateRemaining = () => {
      const diff = Math.min(...AVAILABLE_PROVIDERS
        .map((providerCode) => providerSyncStatuses[providerCode])
        .filter((status) => status && status.next_execution && !status.sync_running)
        .map((status) => new Date(status.next_execution).getTime() - Date.now())
        .filter((value) => value > 0));

      if (diff === Infinity || diff <= 0) {
        setRemainingMs(0);
        clearInterval(timer);
        void loadProviderSyncStatus();
        return;
      }

      setRemainingMs(diff);
    };

    updateRemaining();

    timer = setInterval(updateRemaining, 1000);

    return () => clearInterval(timer);
  }, [AVAILABLE_PROVIDERS, loadProviderSyncStatus, providerSyncStatuses]);

  const formatRemainingTime = useCallback((ms) => {
    if (ms <= 0) {
      return "Disponível agora";
    }

    const totalMinutes = Math.ceil(ms / 60000);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `Disponível em ${minutes} min`;
    }

    return `Disponível em ${hours}h ${minutes}min`;
  }, []);

  const openOpportunityDetail = useCallback((opportunity) => {
    const opportunityId = String(opportunity?.id || "").trim();

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    if (!opportunityId) {
      openDetail(opportunity || null);
      return;
    }

    lastOpenedOpportunityIdRef.current = opportunityId;
    lastOpenedOpportunityRowRef.current = opportunityRowRefs.current.get(opportunityId) || null;
    setSelectedOpportunityId(opportunityId);
    openDetail(opportunity || null);
  }, [openDetail]);

  const restoreSelectedOpportunityRow = useCallback(async () => {
    const opportunityId = String(lastOpenedOpportunityIdRef.current || "").trim();
    if (!opportunityId) return;

    await waitForRenderCommit();

    const selector = `[data-opportunity-id="${opportunityId}"]`;
    const targetRow = document.querySelector(selector) || lastOpenedOpportunityRowRef.current;
    if (targetRow && typeof targetRow.scrollIntoView === "function") {
      targetRow.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [waitForRenderCommit]);

  useEffect(() => {
    if (selectedOpportunity && detailRef.current) {
      detailRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [selectedOpportunity]);

  useEffect(() => {
    if (!loading && paginatingRef.current) {
      paginatingRef.current = false;
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const closeDetail = useCallback(() => {
    originalCloseDetail();
    void restoreSelectedOpportunityRow();
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setSelectedOpportunityId(null);
      highlightTimeoutRef.current = null;
    }, 2500);
  }, [originalCloseDetail, restoreSelectedOpportunityRow]);

  const handleManualSync = useCallback(() => {
    if (isProviderSyncRunning) {
      return;
    }

    setSyncPreparationOpen(true);
  }, [isProviderSyncRunning]);

  const reloadWithCurrentFilters = useCallback((nextPage = page, nextPageSize = pageSize) => {
    reload({
      page: nextPage,
      pageSize: nextPageSize,
      filters: buildSQLFilters({
        filtroCidade,
        filtroEstado,
        filtroOrigem,
        filtroDistrito,
        filtroParticulares,
        filtroData,
        filtroTipologia,
        filtroPrecoMin,
        filtroPrecoMax
      })
    });
  }, [
    filtroCidade,
    filtroData,
    filtroDistrito,
    filtroEstado,
    filtroOrigem,
    filtroParticulares,
    filtroPrecoMax,
    filtroPrecoMin,
    filtroTipologia,
    page,
    pageSize,
    reload
  ]);

  const handlePageChange = useCallback((nextPage) => {
    const totalPages = Math.max(1, Number(snapshot?.pagination?.totalPages ?? 1) || 1);
    const safePage = Math.min(Math.max(1, Number(nextPage) || 1), totalPages);

    if (safePage === page) {
      return;
    }

    paginatingRef.current = true;
    setPage(safePage);
    reloadWithCurrentFilters(safePage, pageSize);
  }, [page, pageSize, reloadWithCurrentFilters, snapshot?.pagination?.totalPages]);

  const syncGuardRef = useRef(false);

  const handleConfirmSyncPreparation = useCallback(async (config) => {
    if (syncGuardRef.current || isProviderSyncRunning) {
      return;
    }

    const selectedProviders = Array.isArray(config?.providers) && config.providers.length > 0
      ? config.providers
      : (config?.provider ? [config.provider] : []);

    const syncConfig = {
      providers: selectedProviders,
      districts: Array.isArray(config?.districts) ? config.districts : [],
      includePrivateOwners: config?.includePrivateOwners ?? true,
      includeProfessionalOwners: config?.includeProfessionalOwners ?? true
    };

    if (selectedProviders.length === 0) {
      notifyError("Seleccione pelo menos um provider para sincronizar.");
      return;
    }

    syncGuardRef.current = true;
    setSyncPreparationOpen(false);

    try {
      await waitForRenderCommit();

      const results = [];
      for (const provider of selectedProviders) {
        const normalizedProvider = String(provider || "").trim().toLowerCase();
        if (!AVAILABLE_PROVIDERS.includes(normalizedProvider)) {
          notifyError(`Provider inválido: ${provider}`);
          continue;
        }

        let status = null;
        try {
          status = await getProviderSyncStatus(normalizedProvider);
          setProviderSyncStatuses((current) => ({
            ...current,
            [normalizedProvider]: status || {
              provider_code: normalizedProvider,
              empresa_id: null,
              sync_running: false,
              last_execution: null,
              next_execution: null,
              canSync: false,
              remainingMs: 0,
              statusLabel: "Estado indisponível"
            }
          }));
        } catch (error) {
          console.error(`[Radar] Erro ao revalidar estado da sincronização para ${normalizedProvider}:`, error);
          status = providerSyncStatuses[normalizedProvider];
        }

        const canSync = Boolean(status?.canSync) && !status?.sync_running;
        if (!canSync) {
          notifyInfo(`Atualização disponível apenas de 4 em 4 horas para ${normalizedProvider}.`);
          continue;
        }

        try {
          await runImovirtualSync({ ...syncConfig, provider: normalizedProvider, providers: [normalizedProvider] });
          results.push(normalizedProvider);
        } catch (error) {
          notifyError(`Falha ao sincronizar ${normalizedProvider}: ${error.message || "Erro desconhecido"}`);
        }
      }

      if (results.length > 0) {
        await reload();
        await waitForRenderCommit();
        notifySuccess(`Oportunidades atualizadas para: ${results.join(", ")}.`);
      }
    } finally {
      syncGuardRef.current = false;
    }
  }, [filtroPrecoMax, filtroPrecoMin, filtroTipologia, isProviderSyncRunning, reload, waitForRenderCommit]);

  const handleImportOpportunity = useCallback(async (opportunity) => {
    const result = await importSelectedToLeads({ opportunity, user });

    if (result?.ok) {
      notifySuccess(result.message || "Lead importada com sucesso.");
      await reload();
      closeDetail();
      return;
    }

    notifyError(result?.message || "Não foi possível importar para Leads.");
  }, [closeDetail, importSelectedToLeads, reload, user]);

  const handleChangeOperationalState = useCallback(async (event) => {
    const nextState = event.target.value;
    if (!selectedOpportunity?.id) return;

    const result = await updateOpportunityState({
      opportunityId: selectedOpportunity.id,
      nextState
    });

    if (result?.ok) {
      notifyInfo("Estado operacional atualizado.");
      return;
    }

    notifyError(result?.message || "Não foi possível atualizar o estado.");
  }, [selectedOpportunity?.id, updateOpportunityState]);

  const kpis = useMemo(
    () => mapRadarKpisViewModel(snapshot?.kpis || []),
    [snapshot]
  );

  const fluxo = useMemo(
    () => mapRadarFlowViewModel(snapshot?.flow || []),
    [snapshot]
  );

  const roadmap = useMemo(
    () => mapRadarRoadmapViewModel(snapshot?.roadmap || []),
    [snapshot]
  );

  const filterOptions = useMemo(() => {
    const fo = snapshot?.filterOptions || {};
    return {
      distritos: fo.districts || [],
      origens: fo.providers || []
    };
  }, [snapshot]);

  const tabela = useMemo(() => {
    return mapRadarTableViewModel(snapshot?.rows || []);
  }, [snapshot]);

  const isImportedOpportunity = useCallback(
    (opportunity) => opportunity?.imported === true || String(opportunity?.estado || "").toLowerCase() === "importado",
    []
  );

  const isIgnoredOpportunity = useCallback(
    (opportunity) => String(opportunity?.estado || "").toLowerCase() === "ignorado",
    []
  );

  // SCORE DESATIVADO NA BETA
  // Funcionalidade reservada para futura Inteligência Comercial.
  const colunasTabela = useMemo(() => [
    {
      key: "imovel",
      title: "Imóvel",
      width: "28%",
      render: (row) => (
        <button
          type="button"
          onClick={() => openOpportunityDetail(row.rawOpportunity || null)}
          style={{
            ...styles.linkButton,
            display: "block",
            width: "100%",
            maxWidth: "100%",
            lineHeight: 1.4,
            whiteSpace: "normal",
            textAlign: "left",
            overflowWrap: "anywhere",
            wordBreak: "break-word"
          }}
        >
          {row.rawOpportunity?.titulo || row.imovel}
        </button>
      )
    },
    { key: "proprietario", title: "Proprietário", width: "8%", render: (row) => row.rawOpportunity?.owner_name || "N/A" },
    {
      key: "localizacao",
      title: "Localização",
      width: "13%",
      render: (row) => {
        const raw = row?.rawOpportunity || {};
        const primary = row?.localizacao || raw?.cidade || raw?.distrito || raw?.morada || "Sem localização";
        const secondary = raw?.morada || raw?.location || raw?.localizacao || "";
        const tooltipText = [raw?.cidade, raw?.distrito, raw?.morada || raw?.location].filter(Boolean).join(" · ") || primary;

        return (
          <div
            title={tooltipText}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 2,
              width: "100%",
              maxWidth: "100%",
              lineHeight: 1.2,
              minWidth: 0,
              overflow: "hidden"
            }}
          >
            <span
              style={{
                display: "block",
                width: "100%",
                maxWidth: "100%",
                lineHeight: 1.35,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                fontSize: "0.86rem",
                fontWeight: 600,
                color: theme.colors.text
              }}
            >
              {primary}
            </span>
            {secondary ? (
              <span
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: "100%",
                  lineHeight: 1.35,
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  fontSize: "0.76rem",
                  color: theme.colors.muted
                }}
              >
                {secondary}
              </span>
            ) : null}
          </div>
        );
      }
    },
    { key: "preco", title: "Preço", width: "9%" },
    {
      key: "publicado",
      title: "Publicado em",
      width: "9%",
      render: (row) => {
        const raw = row?.rawOpportunity || {};
        return formatPublishedDate(raw?.published_at ?? null);
      },
      sortAccessor: (row) => {
        const raw = row?.rawOpportunity || {};
        const sourceDate = raw?.published_at ?? null;
        const parsed = sourceDate ? new Date(sourceDate) : null;
        return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
      }
    },
    {
      key: "importado",
      title: "Importado em",
      width: "9%",
      render: (row) => {
        const raw = row?.rawOpportunity || {};
        return formatDateTime(raw?.created_at ?? null);
      }
    },
    {
      key: "estado",
      title: "Estado",
      width: "6%",
      render: (row) => {
        const estado = String(row.estado || "").toLowerCase();
              const variant =
          estado === "importado"
                  ? "success"
            : estado === "analisado"
                    ? "warning"
              : estado === "ignorado"
                      ? "neutral"
                : estado === "prioritario" || estado === "elevado"
                  ? "danger"
                  : "primary";

        return (
          <>
            {estado !== "importado" ? <Badge variant={variant} style={nowrapBadgeStyle}>{row.estado}</Badge> : null}
          </>
        );
      }
    },
    {
      key: "provider",
      title: "Origem",
      width: "6%",
      render: (row) => {
        const providerValue =
        row?.provider ||
        row?.rawOpportunity?.origem ||
        row?.rawOpportunity?.source
        ||
        row?.source ||
        "";
        const providerName = getProviderLabel(providerValue);
        const logoUrl = getProviderLogo(providerValue);

        if (logoUrl) {
          return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
              <img
                src={logoUrl}
                alt={providerName}
                title={providerName}
                style={{ width: 46, height: 46, objectFit: "contain", display: "block", borderRadius: 4 }}
              />
            </div>
          );
        }

        return (
          <span title={providerName} style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.74rem", color: theme.colors.muted }}>
            {providerName}
          </span>
        );
      }
    },
    {
      key: "acoes",
      title: "Ações",
      width: "12%",
      render: (row) => {
        const isImported = isImportedOpportunity(row.rawOpportunity || row);
        const isIgnored = isIgnoredOpportunity(row.rawOpportunity || row);
              return (
          <div style={styles.rowActions}>
            <Button size="sm" variant="ghost" style={nowrapButtonStyle} onClick={() => openOpportunityDetail(row.rawOpportunity || null)}>
              Abrir detalhe
            </Button>
            <Button
              size="sm"
              variant="secondary"
              style={nowrapButtonStyle}
              disabled={importingId === row.id || isImported || isIgnored}
              onClick={() => handleImportOpportunity(row.rawOpportunity || null)}
            >
              {importingId === row.id ? "A importar..." : isImported ? "IMPORTADO" : "Importar Lead"}
            </Button>
                  </div>
              );
      }
    }
  ], [
    handleImportOpportunity,
    importingId,
    isIgnoredOpportunity,
    isImportedOpportunity,
    nowrapBadgeStyle,
    nowrapButtonStyle,
    openOpportunityDetail,
    styles.linkButton,
    styles.rowActions
  ]);

  const tableRows = useMemo(() => {
    const source = snapshot?.rows || [];

    const mapped = mapRadarTableViewModel(source);
    return mapped.map((row, index) => ({
      ...row,
      id: row.id || `radar-row-${index}`,
      rawOpportunity:
        source.find((item) => String(item?.id) === String(row?.id)) ||
        source[index] ||
        null
    }));
    // SQL ORDER BY handles row ordering — no JS sort applied
  }, [snapshot]);

  const radarRecentTimeline = useMemo(() => {
    const getDiscoveryTimestamp = (row) => {
      const raw = row?.rawOpportunity || {};
      const sourceDate = raw?.created_at || raw?.detected_at || raw?.publicado_em || null;
      const parsed = sourceDate ? new Date(sourceDate) : null;
      return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
    };

    return [...tableRows]
      .sort((a, b) => getDiscoveryTimestamp(b) - getDiscoveryTimestamp(a))
      .map((row, index) => {
        const raw = row?.rawOpportunity || {};
        return {
          id: row?.id || `timeline-op-${index}`,
          titulo: row?.imovel || raw?.titulo || "Sem imóvel",
          localizacao: row?.localizacao || raw?.morada || raw?.location || "Sem localização",
          descoberta: raw?.created_at || raw?.detected_at || raw?.publicado_em || null,
          provider: String(raw?.source || raw?.origem || "N/A")
        };
      });
  }, [tableRows]);

  const visibleTimeline = useMemo(() => {
    return radarRecentTimeline.slice(0, timelineVisibleCount);
  }, [radarRecentTimeline, timelineVisibleCount]);

  const hasMoreTimeline = timelineVisibleCount < radarRecentTimeline.length;

  const activeFilterLabels = useMemo(() => {
    const labels = [];

    if (filtroCidade && String(filtroCidade).trim()) labels.push(`Concelho: ${String(filtroCidade).trim()}`);
    if (filtroDistrito && filtroDistrito !== "todos") labels.push(`Distrito: ${filtroDistrito}`);
    if (filtroOrigem && filtroOrigem !== "todos") labels.push(`Origem: ${filtroOrigem}`);
    if (filtroEstado && filtroEstado !== "todos") labels.push(`Estado: ${filtroEstado}`);
    if (filtroParticulares && filtroParticulares !== "todos") labels.push(`Particulares: ${filtroParticulares === "particulares" ? "Particulares" : "Não particulares"}`);
    if (filtroData && filtroData !== "todos") labels.push(`Data: ${filtroData === "24h" ? "Últimas 24h" : filtroData === "7d" ? "Últimos 7d" : filtroData === "15d" ? "Últimos 15d" : "30 dias+"}`);
    if (filtroTipologia && String(filtroTipologia).trim() && String(filtroTipologia).trim() !== "todos") labels.push(`Tipologia: ${String(filtroTipologia).trim()}`);
    if (filtroPrecoMin && String(filtroPrecoMin).trim()) labels.push(`Preço mínimo: ${String(filtroPrecoMin).trim()}`);
    if (filtroPrecoMax && String(filtroPrecoMax).trim()) labels.push(`Preço máximo: ${String(filtroPrecoMax).trim()}`);

    return labels;
  }, [filtroCidade, filtroData, filtroDistrito, filtroEstado, filtroOrigem, filtroParticulares, filtroPrecoMax, filtroPrecoMin, filtroTipologia]);

  useEffect(() => {
    setTimelineVisibleCount(TIMELINE_PAGE_SIZE);
  }, [radarRecentTimeline.length, TIMELINE_PAGE_SIZE]);

  return (
    <div style={styles.page}>
      <Card style={styles.hero}>
        <Badge variant="primary" style={{ ...styles.heroBadge, ...nowrapBadgeStyle }}>Radar Beta</Badge>
        <h1 style={styles.title}>🎯 OSFlow Radar</h1>
        <p style={styles.subtitle}>As oportunidades não esperam. O Radar encontra-as primeiro.</p>
        <p style={styles.description}>
          O Radar será responsável por identificar automaticamente novas oportunidades de angariação provenientes
          de múltiplas fontes, organizando-as para análise e importação para o CRM.
        </p>
      </Card>

      <section style={styles.section} className="radar-section-spacing">
        <h2 style={styles.sectionTitle}>Indicadores</h2>
        <div className="radar-indicator-row">
          {kpis.map((item) => (
            <KpiCard
              key={item.id}
              className="radar-indicator-card"
              titulo={item.titulo}
              valor={item.valor}
              variacao={item.variacao}
              descricao={item.descricao}
              icone={item.icone}
              cor={item.cor}
            />
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Filtros operacionais</h2>
          <Badge variant="neutral" style={nowrapBadgeStyle}>Dados operacionais</Badge>
        </div>
        <Card style={styles.filterCard}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            marginBottom: '10px'
          }}>
            <label style={styles.filterField}>
              Distrito
              <select value={filtroDistrito} onChange={(event) => { const v = event.target.value; setFiltroDistrito(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito: v, filtroParticulares, filtroData, filtroTipologia, filtroPrecoMin, filtroPrecoMax }) }); }} style={styles.filterControl}>
                <option value="todos">Todos</option>
                {filterOptions.distritos.map((distrito) => (
                  <option key={distrito} value={distrito}>{distrito}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              Concelho
              <input
                type="text"
                value={filtroCidade}
                placeholder="Digite o concelho"
                aria-label="Filtro de concelho"
                title="Filtro de concelho"
                style={styles.filterControl}
                onChange={(event) => { const v = event.target.value; setFiltroCidade(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade: v, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares, filtroData, filtroTipologia, filtroPrecoMin, filtroPrecoMax }) }); }}
              />
            </label>

            <label style={styles.filterField}>
              Estado
              <select value={filtroEstado} onChange={(event) => { const v = event.target.value; setFiltroEstado(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado: v, filtroOrigem, filtroDistrito, filtroParticulares, filtroData, filtroTipologia, filtroPrecoMin, filtroPrecoMax }) }); }} style={styles.filterControl}>
                <option value="todos">Todos</option>
                <option value="novo">Novo</option>
                <option value="importado">Importado</option>
              </select>
            </label>

            <label style={styles.filterField}>
              Origem
              <select value={filtroOrigem} onChange={(event) => {
                const v = String(event.target.value || "").trim().toLowerCase();

                const nextFilters = buildSQLFilters({
                  filtroCidade,
                  filtroEstado,
                  filtroOrigem: v,
                  filtroDistrito,
                  filtroParticulares,
                  filtroData,
                  filtroTipologia,
                  filtroPrecoMin,
                  filtroPrecoMax
                });

                setFiltroOrigem(v);
                setPage(1);
                reload({ page: 1, pageSize, filters: nextFilters });
              }} style={styles.filterControl}>
                <option value="todos">Todos</option>
                {filterOptions.origens.map((origem) => {
                  const optionValue = String(origem || "").trim().toLowerCase();
                  return (
                    <option key={optionValue} value={optionValue}>{getProviderLabel(origem)}</option>
                  );
                })}
              </select>
            </label>

            <label style={styles.filterField}>
              Particulares
              <select value={filtroParticulares} onChange={(e) => { const v = e.target.value; setFiltroParticulares(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares: v, filtroData, filtroTipologia, filtroPrecoMin, filtroPrecoMax }) }); }} style={styles.filterControl}>
                <option value="todos">Todos</option>
                <option value="particulares">Particulares</option>
                <option value="nao_particulares">Não particulares</option>
              </select>
            </label>

            <label style={styles.filterField}>
              Data
              <select value={filtroData} onChange={(e) => { const v = e.target.value; setFiltroData(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares, filtroData: v, filtroTipologia, filtroPrecoMin, filtroPrecoMax }) }); }} style={styles.filterControl}>
                <option value="todos">Tudo</option>
                <option value="24h">Últimas 24h</option>
                <option value="7d">Últimos 7d</option>
                <option value="15d">Últimos 15d</option>
                <option value="30d_plus">30 dias+</option>
              </select>
            </label>

            <label style={styles.filterField}>
              Tipologia
              <select value={filtroTipologia} onChange={(event) => { const v = event.target.value; setFiltroTipologia(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares, filtroData, filtroTipologia: v, filtroPrecoMin, filtroPrecoMax }) }); }} style={styles.filterControl}>
                <option value="todos">Todos</option>
                <option value="T0">T0</option>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
                <option value="T3">T3</option>
                <option value="T4">T4</option>
                <option value="T5+">T5+</option>
                <option value="V1">V1</option>
                <option value="V2">V2</option>
                <option value="V3">V3</option>
                <option value="V4">V4</option>
                <option value="V5+">V5+</option>
              </select>
            </label>

            <label style={styles.filterField}>
              Preço mínimo
              <input
                type="number"
                min="0"
                step="1000"
                value={filtroPrecoMin}
                placeholder="Ex: 150000"
                style={styles.filterControl}
                onChange={(event) => { const v = event.target.value; setFiltroPrecoMin(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares, filtroData, filtroTipologia, filtroPrecoMin: v, filtroPrecoMax }) }); }}
              />
            </label>

            <label style={styles.filterField}>
              Preço máximo
              <input
                type="number"
                min="0"
                step="1000"
                value={filtroPrecoMax}
                placeholder="Ex: 500000"
                style={styles.filterControl}
                onChange={(event) => { const v = event.target.value; setFiltroPrecoMax(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares, filtroData, filtroTipologia, filtroPrecoMin, filtroPrecoMax: v }) }); }}
              />
            </label>
          </div>

          <div style={styles.filterFooter}>
            <span style={styles.filterInfo}>
              {snapshot?.pagination?.total ?? tableRows.length} oportunidade(s)
            </span>
            <Button
              variant="ghost"
              style={nowrapButtonStyle}
              onClick={() => {
                setFiltroDistrito("todos");
                setFiltroCidade("");
                setFiltroEstado("todos");
                setFiltroOrigem("todos");
                setFiltroParticulares("todos");
                setFiltroData("todos");
                setFiltroTipologia("todos");
                setFiltroPrecoMin("");
                setFiltroPrecoMax("");
                setPage(1);
                reload({ page: 1, pageSize, filters: {} });
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </Card>
      </section>

      <section style={styles.section} ref={tableRef}>
        <h2 style={styles.sectionTitle}>Tabela de oportunidades</h2>
        <Card style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <div style={styles.actionRow}>
              <Button
                variant="secondary"
                style={nowrapButtonStyle}
                onClick={handleManualSync}
                disabled={providerSyncStatusLoading || !canRunAnyProvider || isProviderSyncRunning}
              >
                {providerSyncStatusLoading
                  ? "⏳ A carregar estado dos providers..."
                  : isProviderSyncRunning
                    ? "⏳ Atualizando oportunidades… Aguarde."
                    : canRunAnyProvider
                      ? "🔄 Atualizar Oportunidades"
                      : "⏱️ Aguarde a próxima sincronização"}
              </Button>

              {!providerSyncStatusLoading && !canRunAnyProvider && !isProviderSyncRunning && (
                <p
                  style={{
                    marginLeft: 12,
                    marginTop: 8,
                    color: "#6b7280",
                    fontSize: "0.9rem"
                  }}
                >
                  ⏱️ {formatRemainingTime(remainingMs)}
                </p>
              )}
              </div>

              {loading ? <Loading label="A carregar Radar..." /> : null}
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 260 }}>
              <span style={styles.filterInfo}>
                Resumo: {snapshot?.pagination?.totalPages ?? 1} páginas · {snapshot?.pagination?.total ?? tableRows.length} registos
              </span>
              {activeFilterLabels.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span style={{ ...styles.filterInfo, fontWeight: 600 }}>Filtros:</span>
                  {activeFilterLabels.map((label) => (
                    <Badge key={label} variant="neutral" style={{ ...nowrapBadgeStyle, fontSize: "0.75rem" }}>{label}</Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", width: "100%", maxWidth: 520 }}>
              <PaginationControls
                currentPage={page}
                totalPages={snapshot?.pagination?.totalPages ?? 1}
                onPageChange={handlePageChange}
              />
            </div>
          </div>

          {error ? (
            <p style={styles.errorText}>
              Falha ao carregar Radar: {error?.message || "erro desconhecido"}
            </p>
          ) : null}

          <Table
            columns={colunasTabela}
            rows={tableRows}
            compact={true}
            emptyMessage="Sem oportunidades disponíveis"
            style={{ overflowX: "hidden" }}
            tableStyle={{ tableLayout: "fixed" }}
            rowProps={(row, _index, computedKey) => {
              const opportunityId = String(row?.rawOpportunity?.id || row?.id || computedKey || "").trim();
              const isSelected = Boolean(opportunityId && opportunityId === selectedOpportunityId);
              return {
                "data-opportunity-id": opportunityId || undefined,
                style: {
                  background: isSelected ? "rgba(13,44,77,0.08)" : undefined,
                  transition: "background-color 250ms ease"
                },
                ref: (element) => {
                  if (!opportunityId) return;

                  if (element) {
                    opportunityRowRefs.current.set(opportunityId, element);
                  } else {
                    opportunityRowRefs.current.delete(opportunityId);
                  }
                }
              };
            }}
          />
          {tableRows.length > 0 ? (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginTop: "12px",
              flexWrap: "wrap"
            }}>
              <span style={styles.filterInfo}>
                Página {snapshot?.pagination?.page ?? page} de {snapshot?.pagination?.totalPages ?? 1} ({snapshot?.pagination?.total ?? tableRows.length} registos)
              </span>
              <PaginationControls
                currentPage={page}
                totalPages={snapshot?.pagination?.totalPages ?? 1}
                onPageChange={handlePageChange}
              />
            </div>
          ) : null}
        </Card>
      </section>

      <section style={styles.section} className="radar-section-spacing">
        <h2 style={styles.sectionTitle}>Últimas oportunidades adicionadas ao Radar</h2>
        <Card style={styles.timelineCard} className="radar-timeline-card">
          {radarRecentTimeline.length === 0 ? (
            <p style={styles.timelineEmpty}>Sem oportunidades recentes.</p>
          ) : (
            visibleTimeline.map((item) => (
              <div key={item.id} style={styles.timelineItem}>
                <div style={styles.timelineItemInfo}>
                  <strong style={styles.timelineItemTitle}>{item.titulo}</strong>
                  <span style={styles.timelineItemEvent}>{item.localizacao}</span>
                </div>
                <div style={styles.timelineItemMeta}>
                  <Badge variant="neutral" style={nowrapBadgeStyle}>{item.provider}</Badge>
                  <span style={styles.timelineDate}>{item.descoberta ? new Date(item.descoberta).toLocaleString("pt-PT") : "Data indisponível"}</span>
                </div>
              </div>
            ))
          )}
          {hasMoreTimeline ? (
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "center" }}>
              <Button
                variant="ghost"
                style={nowrapButtonStyle}
                onClick={() => setTimelineVisibleCount((prev) => prev + TIMELINE_PAGE_SIZE)}
              >
                Mostrar mais
              </Button>
            </div>
          ) : null}
        </Card>
      </section>

      <section style={styles.section} className="radar-section-spacing">
        <h2 style={styles.sectionTitle}>Fluxo operacional</h2>
        <div className="radar-horizontal-cards">
          {fluxo.map((etapa, index) => (
            <Card key={etapa.id} style={styles.flowCard} className="radar-compact-card">
              <Badge variant="primary" style={{ ...styles.flowStepBadge, ...nowrapBadgeStyle }}>{`Etapa ${index + 1}`}</Badge>
              <h3 style={styles.flowName}>{etapa.label}</h3>
            </Card>
          ))}
        </div>
      </section>

      <section style={styles.section} className="radar-section-spacing">
        <h2 style={styles.sectionTitle}>Roadmap do Radar</h2>
        <div className="radar-horizontal-cards">
          {roadmap.map((item, index) => (
            <Card key={item.id} style={styles.flowCard} className="radar-compact-card">
              <Badge variant="success" style={{ ...styles.flowStepBadge, ...nowrapBadgeStyle }}>{String(index + 1).padStart(2, "0")}</Badge>
              <h3 style={styles.flowName}>{item.label}</h3>
            </Card>
          ))}
        </div>
      </section>

      {selectedOpportunity ? (
        <section style={styles.section} ref={detailRef}>
          <h2 style={styles.sectionTitle}>Detalhe da oportunidade</h2>
          <Card style={{ ...styles.detailCard, opacity: String(selectedOpportunity.estado || "").toLowerCase() === "importado" ? 0.6 : 1 }}>
            <div style={styles.detailHeader}>
              <strong style={styles.detailTitle}>{selectedOpportunity.titulo}</strong>
              <Badge variant="primary" style={{ marginLeft: '10px', fontSize: '1.1em', ...nowrapBadgeStyle }}>{selectedOpportunity.preco}</Badge>
            </div>

            <p style={styles.detailText}><strong>Proprietário:</strong> {selectedOpportunity.owner_name || "-"}</p>
            <p style={styles.detailText}><strong>Tipo:</strong> {selectedOpportunity.tipo || "-"}</p>
            <p style={styles.detailText}><strong>Quartos:</strong> {selectedOpportunity.quartos || "-"}</p>
            <p style={styles.detailText}><strong>Morada:</strong> {selectedOpportunity.morada || "-"}</p>
            <p style={styles.detailText}><strong>Concelho:</strong> {selectedOpportunity.cidade || "-"}</p>
            <p style={styles.detailText}><strong>Área:</strong> {selectedOpportunity.area || "-"} m²</p>
            <p style={styles.detailText}><strong>URL:</strong> <a href={selectedOpportunity.link || selectedOpportunity.url} target="_blank" rel="noreferrer">Ver Anúncio</a></p>
            <label style={styles.detailField}>
              Estado operacional
              <select
                value={String(selectedOpportunity.estado || "novo").toLowerCase()}
                onChange={handleChangeOperationalState}
                style={styles.detailSelect}
              >
                <option value="novo">Nova</option>
                <option value="importado">Importada</option>
                <option value="ignorado">Ignorada</option>
              </select>
            </label>

            <div style={styles.detailActions}>
              <Button variant="ghost" style={nowrapButtonStyle} onClick={closeDetail}>Fechar detalhe</Button>
            </div>
          </Card>
        </section>
      ) : null}

      <SyncPreparationModal
        open={syncPreparationOpen}
        onClose={() => setSyncPreparationOpen(false)}
        onConfirm={handleConfirmSyncPreparation}
      />
      <SyncProgressModal />
    </div>
  );
}
