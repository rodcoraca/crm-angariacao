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
import {
  useRadar,
  mapRadarFlowViewModel,
  mapRadarKpisViewModel,
  mapRadarRoadmapViewModel,
  mapRadarTableViewModel
} from "../modules/radar";
import { createRadarStyles } from "./radarStyles";
import { runImovirtualSync } from "../providers/services/providers/providerSyncRunner";
import { canExecuteSync } from "../providers/services/providers/providerSyncService";
import SyncProgressModal from "../components/radar/SyncProgressModal";
import SyncPreparationModal from "../components/radar/SyncPreparationModal";
import { getProviderSyncStatus } from "../providers/services/providers/providerSyncService";
import { providerSyncEngine, SyncState } from "../shared/provider-engine/sync/ProviderSyncEngine";
import { useNavigationGuard } from "../shared/navigation";

function buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares, filtroData }) {
  const f = {};
  if (filtroCidade && String(filtroCidade).trim()) f.city = String(filtroCidade).trim();
  if (filtroDistrito && filtroDistrito !== "todos") f.district = filtroDistrito;
  if (filtroOrigem && filtroOrigem !== "todos") f.provider = filtroOrigem;
  if (filtroEstado && filtroEstado !== "todos") f.estado = filtroEstado;
  if (filtroParticulares === "particulares") f.is_private_owner = true;
  else if (filtroParticulares === "nao_particulares") f.is_private_owner = false;
  const agora = new Date();
  if (filtroData === "24h") f.date_after = new Date(agora - 24 * 60 * 60 * 1000).toISOString();
  else if (filtroData === "7d") f.date_after = new Date(agora - 7 * 24 * 60 * 60 * 1000).toISOString();
  else if (filtroData === "15d") f.date_after = new Date(agora - 15 * 24 * 60 * 60 * 1000).toISOString();
  else if (filtroData === "30d_plus") f.date_before = new Date(agora - 30 * 24 * 60 * 60 * 1000).toISOString();
  return f;
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
  const [filtroParticulares, setFiltroParticulares] = useState("todos");
  const [filtroData, setFiltroData] = useState("todos");
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(5);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(null);

  const [providerSyncStatus, setProviderSyncStatus] = useState(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [syncPreparationOpen, setSyncPreparationOpen] = useState(false);
  const [syncActive, setSyncActive] = useState(false);
  const syncActiveRef = useRef(false);

  const TIMELINE_PAGE_SIZE = 5;
  const styles = useMemo(() => createRadarStyles(theme), [theme]);
  const nowrapButtonStyle = useMemo(() => ({ whiteSpace: "nowrap", minWidth: "120px" }), []);
  const nowrapBadgeStyle = useMemo(() => ({ whiteSpace: "nowrap" }), []);

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
    try {
      const status = await getProviderSyncStatus("imovirtual");
      setProviderSyncStatus(status);
    } catch (error) {
      console.error("[Radar] Erro ao obter estado da sincronização:", error);
      setProviderSyncStatus(null);
    }
  }, []);

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
      const active = syncStates.has(eventState) || Boolean(providerSyncStatus?.sync_running);
      syncActiveRef.current = active;
      setSyncActive(active);
    };

    updateSyncActive(providerSyncEngine.state);

    const unsubscribe = providerSyncEngine.subscribe((incoming) => {
      updateSyncActive(incoming.state);
    });

    return () => unsubscribe();
  }, [providerSyncStatus?.sync_running]);

  useNavigationGuard({
    isEditing: syncActive,
    isEditingNow: () => syncActiveRef.current || Boolean(providerSyncStatus?.sync_running),
    onSave: undefined,
    onDiscard: undefined,
    onCancelEditing: undefined,
    markClean: undefined
  });

  useEffect(() => {
    if (!providerSyncStatus?.next_execution) {
      setRemainingMs(0);
      return;
    }

    let timer;

    const updateRemaining = () => {
    const diff =
        new Date(providerSyncStatus.next_execution).getTime() - Date.now();

      if (diff <= 0) {
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
  }, [providerSyncStatus]);

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
    setSyncPreparationOpen(true);
  }, []);

  const syncGuardRef = useRef(false);

  const handleConfirmSyncPreparation = useCallback(async (config) => {
    if (syncGuardRef.current) {
      return;
    }

    syncGuardRef.current = true;
    setSyncPreparationOpen(false);

    try {
      await waitForRenderCommit();

      const canSync = await canExecuteSync("imovirtual");
      if (!canSync) {
        notifyInfo("Atualização disponível apenas de 4 em 4 horas.");
        return;
      }

      notifyInfo("Atualizando oportunidades...");

      try {
        await runImovirtualSync(config);

        await reload();
        await waitForRenderCommit();
        notifySuccess("Oportunidades atualizadas.");
      } catch (error) {
        notifyError("Falha ao sincronizar: " + (error.message || "Erro desconhecido"));
      }
    } finally {
      syncGuardRef.current = false;
    }
  }, [reload, waitForRenderCommit]);

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

  const isImovirtualOpportunity = useCallback(
    (opportunity) => String(opportunity?.source || opportunity?.origem || "").toLowerCase() === "imovirtual",
    []
  );

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
      render: (row) => (
            <button
              type="button"
          onClick={() => openOpportunityDetail(row.rawOpportunity || null)}
          style={styles.linkButton}
        >
              {row.rawOpportunity?.titulo || row.imovel}
        </button>
      )
    },
    { key: "proprietario", title: "Proprietário", render: (row) => row.rawOpportunity?.owner_name || "N/A" }, // Novo
    { key: "localizacao", title: "Localização" },
    { key: "preco", title: "Preço" },
    {
      key: "publicado",
      title: "Publicado",
      sortAccessor: (row) => {
        const raw = row?.rawOpportunity || {};
        const sourceDate = raw?.created_at_first || raw?.publicado_em || null;
        const parsed = sourceDate ? new Date(sourceDate) : null;
        return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
      }
    },
    {
      key: "estado",
      title: "Estado",
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
            {isImovirtualOpportunity(row.rawOpportunity) ? <Badge variant="neutral" style={nowrapBadgeStyle}>Imovirtual</Badge> : null}
          </>
        );
      }
    },
    {
      key: "acoes",
      title: "Ações",
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
    isImovirtualOpportunity,
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
      const sourceDate = raw?.detected_at || raw?.created_at || raw?.publicado_em || null;
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
          descoberta: raw?.detected_at || raw?.created_at || raw?.publicado_em || null,
          provider: String(raw?.source || raw?.origem || "N/A")
        };
      });
  }, [tableRows]);

  const visibleTimeline = useMemo(() => {
    return radarRecentTimeline.slice(0, timelineVisibleCount);
  }, [radarRecentTimeline, timelineVisibleCount]);

  const hasMoreTimeline = timelineVisibleCount < radarRecentTimeline.length;

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
              <select value={filtroDistrito} onChange={(event) => { const v = event.target.value; setFiltroDistrito(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito: v, filtroParticulares, filtroData }) }); }} style={styles.filterControl}>
                <option value="todos">Todos</option>
                {filterOptions.distritos.map((distrito) => (
                  <option key={distrito} value={distrito}>{distrito}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              Cidade
              <input
                type="text"
                value={filtroCidade}
                placeholder="Pesquisar cidade..."
                style={styles.filterControl}
                onChange={(event) => { const v = event.target.value; setFiltroCidade(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade: v, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares, filtroData }) }); }}
              />
            </label>

            <label style={styles.filterField}>
              Estado
              <select value={filtroEstado} onChange={(event) => { const v = event.target.value; setFiltroEstado(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado: v, filtroOrigem, filtroDistrito, filtroParticulares, filtroData }) }); }} style={styles.filterControl}>
                <option value="todos">Todos</option>
                <option value="novo">Novo</option>
                <option value="importado">Importado</option>
              </select>
            </label>

            <label style={styles.filterField}>
              Origem
              <select value={filtroOrigem} onChange={(event) => { const v = event.target.value; setFiltroOrigem(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem: v, filtroDistrito, filtroParticulares, filtroData }) }); }} style={styles.filterControl}>
                <option value="todos">Todos</option>
                {filterOptions.origens.map((origem) => (
                  <option key={origem} value={origem}>{origem}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              Particulares
              <select value={filtroParticulares} onChange={(e) => { const v = e.target.value; setFiltroParticulares(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares: v, filtroData }) }); }} style={styles.filterControl}>
                <option value="todos">Todos</option>
                <option value="particulares">Particulares</option>
                <option value="nao_particulares">Não particulares</option>
              </select>
            </label>

            <label style={styles.filterField}>
              Data
              <select value={filtroData} onChange={(e) => { const v = e.target.value; setFiltroData(v); setPage(1); reload({ page: 1, pageSize, filters: buildSQLFilters({ filtroCidade, filtroEstado, filtroOrigem, filtroDistrito, filtroParticulares, filtroData: v }) }); }} style={styles.filterControl}>
                <option value="todos">Tudo</option>
                <option value="24h">Últimas 24h</option>
                <option value="7d">Últimos 7d</option>
                <option value="15d">Últimos 15d</option>
                <option value="30d_plus">30 dias+</option>
              </select>
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
                disabled={!providerSyncStatus?.canSync}
              >
                {providerSyncStatus?.sync_running
                  ? "⏳ Atualizando oportunidades..."
                  : providerSyncStatus?.canSync
                    ? "🔄 Atualizar Oportunidades"
                    : "⏱️ Aguarde a próxima sincronização"}
              </Button>

              {providerSyncStatus && !providerSyncStatus.canSync && (
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

          {error ? (
            <p style={styles.errorText}>
              Falha ao carregar Radar: {error?.message || "erro desconhecido"}
            </p>
          ) : null}

          <Table
            columns={colunasTabela}
            rows={tableRows}
            emptyMessage="Sem oportunidades disponíveis"
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
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  variant="ghost"
                  style={nowrapButtonStyle}
                  onClick={() => { paginatingRef.current = true; const next = Math.max(1, page - 1); console.log("[Radar UI] Anterior | page actual:", page, "| page seguinte:", next); setPage(next); reload({ page: next, pageSize }); }}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="ghost"
                  style={nowrapButtonStyle}
                  onClick={() => { paginatingRef.current = true; const next = page + 1; console.log("[Radar UI] Seguinte | page actual:", page, "| page seguinte:", next); setPage(next); reload({ page: next, pageSize }); }}
                  disabled={page >= (snapshot?.pagination?.totalPages ?? 1)}
                >
                  Seguinte
                </Button>
              </div>
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
              {isImovirtualOpportunity(selectedOpportunity) ? <Badge variant="neutral" style={{ marginLeft: '10px', ...nowrapBadgeStyle }}>Imovirtual</Badge> : null}
            </div>

            <p style={styles.detailText}><strong>Proprietário:</strong> {selectedOpportunity.owner_name || "-"}</p>
            <p style={styles.detailText}><strong>Tipo:</strong> {selectedOpportunity.tipo || "-"}</p>
            <p style={styles.detailText}><strong>Quartos:</strong> {selectedOpportunity.quartos || "-"}</p>
            <p style={styles.detailText}><strong>Morada:</strong> {selectedOpportunity.morada || "-"}</p>
            <p style={styles.detailText}><strong>Cidade:</strong> {selectedOpportunity.cidade || "-"}</p>
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
