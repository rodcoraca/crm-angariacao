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

export default function Radar() {
  const tableRef = useRef(null);
  const detailRef = useRef(null);
  const opportunityRowRefs = useRef(new Map());
  const lastOpenedOpportunityIdRef = useRef(null);
  const lastOpenedOpportunityRowRef = useRef(null);
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
    updateOpportunityState
  } = useRadar();
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState("todos");
  const [filtroDistrito, setFiltroDistrito] = useState("todos");
  const [filtroConcelho, setFiltroConcelho] = useState("todos");
  const [filtroParticulares, setFiltroParticulares] = useState("todos");
  const [filtroData, setFiltroData] = useState("todos");
  const [tablePage, setTablePage] = useState(1);
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(5);
  const [syncStatus, setSyncStatus] = useState("");
  const TABLE_PAGE_SIZE = 20;
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

  const openOpportunityDetail = useCallback((opportunity) => {
    const opportunityId = String(opportunity?.id || "").trim();
    if (!opportunityId) {
      openDetail(opportunity || null);
      return;
    }

    lastOpenedOpportunityIdRef.current = opportunityId;
    lastOpenedOpportunityRowRef.current = opportunityRowRefs.current.get(opportunityId) || null;
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


  const closeDetail = useCallback(() => {
    originalCloseDetail();
    void restoreSelectedOpportunityRow();
  }, [originalCloseDetail, restoreSelectedOpportunityRow]);

  useEffect(() => {
    setFiltroConcelho("todos");
    setFiltroCidade("");
  }, [filtroDistrito]);

  useEffect(() => {
    setFiltroCidade("");
  }, [filtroConcelho]);

  const handleManualSync = useCallback(async () => {
    const canSync = await canExecuteSync("imovirtual");
    if (!canSync) {
      notifyInfo("Atualização disponível apenas de 4 em 4 horas.");
      return;
    }

    setSyncStatus("Atualizando oportunidades...");
    notifyInfo("Atualizando oportunidades...");

    try {
      await runImovirtualSync();
      await reload();
      await waitForRenderCommit();
      setSyncStatus("");
      notifySuccess("Oportunidades atualizadas.");
    } catch (error) {
      setSyncStatus("");
      notifyError("Falha ao sincronizar: " + (error.message || "Erro desconhecido"));
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
    const opportunities = snapshot?.opportunities || [];
    const distritoBase = filtroDistrito !== "todos"
      ? opportunities.filter((item) => String(item?.distrito || "").trim() === filtroDistrito)
      : opportunities;

    const concelhoBase = filtroConcelho !== "todos"
      ? distritoBase.filter((item) => String(item?.concelho || "").trim() === filtroConcelho)
      : distritoBase;

    const freguesiaBase = concelhoBase;

    const freguesias = Array.from(new Set(freguesiaBase.map((item) => String(item?.freguesia || item?.cidade || "").trim()).filter(Boolean))).sort();
    const tipos = Array.from(new Set(opportunities.map((item) => String(item?.tipo || "").trim()).filter(Boolean))).sort();
    const estados = Array.from(new Set(opportunities.map((item) => String(item?.estado || "").trim()).filter(Boolean))).sort();
    const origens = Array.from(new Set(opportunities.map((item) => String(item?.source || item?.origem || "").trim()).filter(Boolean))).sort();
    const distritos = Array.from(new Set(opportunities.map((item) => String(item?.distrito || "").trim()).filter(Boolean))).sort();
    const concelhos = Array.from(new Set(distritoBase.map((item) => String(item?.concelho || "").trim()).filter(Boolean))).sort();
    return { freguesias, tipos, estados, origens, distritos, concelhos };
  }, [snapshot, filtroDistrito, filtroConcelho]);

  const filteredOpportunities = useMemo(() => {
    const oportunidades = snapshot?.opportunities || [];
    const freguesiaLower = filtroCidade.trim().toLowerCase();

    // Data filtering logic
    const agora = new Date();
    const filtrarData = (item) => {
      if (filtroData === "todos") return true;

      const dataRaw = item.published_at || item.detected_at;
      if (!dataRaw) return false;
      const data = new Date(dataRaw);
      if (isNaN(data.getTime())) return false;
      const diffMs = agora - data;
      const diffDias = diffMs / (1000 * 60 * 60 * 24);
      if (filtroData === "24h") return diffMs <= (24 * 60 * 60 * 1000);
      if (filtroData === "7d") return diffDias <= 7;
      if (filtroData === "15d") return diffDias <= 15;
      if (filtroData === "30d_plus") return diffDias > 30;
      return true;
    };

    const filtered = oportunidades.filter((item) => {
      const freguesia = String(item?.freguesia || item?.cidade || "").toLowerCase();
      const tipo = String(item?.tipo || "");
      const estado = String(item?.estado || "");
      const origem = String(item?.source || item?.origem || "");
      const distrito = String(item?.distrito || "");
      const concelho = String(item?.concelho || "");

      if (freguesiaLower && !freguesia.includes(freguesiaLower)) return false;
      if (filtroTipo !== "todos" && tipo !== filtroTipo) return false;
      if (filtroEstado !== "todos" && estado !== filtroEstado) return false;
      if (filtroOrigem !== "todos" && origem !== filtroOrigem) return false;
      if (filtroDistrito !== "todos" && distrito !== filtroDistrito) return false;
      if (filtroConcelho !== "todos" && concelho !== filtroConcelho) return false;
      if (filtroParticulares !== "todos") {
          const isPrivate = !!item.is_private;
          if (filtroParticulares === "particulares" && !isPrivate) return false;
          if (filtroParticulares === "nao_particulares" && isPrivate) return false;
      }
      if (filtroData !== "todos" && !filtrarData(item)) return false;

      return true;
    });

    return filtered;
  }, [
    snapshot,
    filtroCidade,
    filtroTipo,
    filtroEstado,
    filtroOrigem,
    filtroDistrito,
    filtroConcelho,
    filtroParticulares,
    filtroData
  ]);

  const tabela = useMemo(() => {
    return mapRadarTableViewModel(filteredOpportunities);
  }, [filteredOpportunities]);

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
    const rows = tabela.map((row, index) => ({
      ...row,
      id: row.id || `radar-row-${index}`,
      rawOpportunity:
        (filteredOpportunities || []).find((item) => String(item?.id) === String(row?.id)) ||
        filteredOpportunities?.[index] ||
        null
    }));

    const getRowTimestamp = (row) => {
      const raw = row?.rawOpportunity || {};
      const sourceDate = raw?.created_at_first || raw?.publicado_em || raw?.detected_at || null;
      const parsed = sourceDate ? new Date(sourceDate) : null;
      const timestamp = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
      return timestamp;
    };

    return [...rows].sort((a, b) => getRowTimestamp(b) - getRowTimestamp(a));
  }, [filteredOpportunities, tabela]);

  const totalTablePages = useMemo(() => {
    return Math.max(1, Math.ceil(tableRows.length / TABLE_PAGE_SIZE));
  }, [tableRows.length, TABLE_PAGE_SIZE]);

  const paginatedTableRows = useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_SIZE;
    const end = start + TABLE_PAGE_SIZE;
    return tableRows.slice(start, end);
  }, [tablePage, tableRows, TABLE_PAGE_SIZE]);

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
    setTablePage(1);
  }, [
    filtroCidade,
    filtroTipo,
    filtroEstado,
    filtroOrigem,
    filtroDistrito,
    filtroConcelho,
    filtroParticulares,
    filtroData
  ]);

  useEffect(() => {
    if (tablePage > totalTablePages) {
      setTablePage(totalTablePages);
    }
  }, [tablePage, totalTablePages]);

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
              <select value={filtroDistrito} onChange={(event) => setFiltroDistrito(event.target.value)} style={styles.filterControl}>
                <option value="">Todos</option>
                {filterOptions.distritos.map((distrito) => (
                  <option key={distrito} value={distrito}>{distrito}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              Concelho
              <select value={filtroConcelho} onChange={(event) => setFiltroConcelho(event.target.value)} style={styles.filterControl}>
                <option value="todos">Todos</option>
                {filterOptions.concelhos.map((concelho) => (
                  <option key={concelho} value={concelho}>{concelho}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              Freguesia
              <select value={filtroCidade} onChange={(event) => setFiltroCidade(event.target.value)} style={styles.filterControl}>
                <option value="">Todos</option>
                {filterOptions.freguesias.map((freguesia) => (
                  <option key={freguesia} value={freguesia}>{freguesia}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              Tipo
              <select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)} style={styles.filterControl}>
                <option value="todos">Todos</option>
                {filterOptions.tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              Estado
              <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)} style={styles.filterControl}>
                <option value="todos">Todos</option>
                {filterOptions.estados.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              Origem
              <select value={filtroOrigem} onChange={(event) => setFiltroOrigem(event.target.value)} style={styles.filterControl}>
                <option value="todos">Todos</option>
                {filterOptions.origens.map((origem) => (
                  <option key={origem} value={origem}>{origem}</option>
                ))}
              </select>
            </label>

            <label style={styles.filterField}>
              Particulares
              <select value={filtroParticulares} onChange={(e) => setFiltroParticulares(e.target.value)} style={styles.filterControl}>
                <option value="todos">Todos</option>
                <option value="particulares">Particulares</option>
                <option value="nao_particulares">Não particulares</option>
              </select>
            </label>

            <label style={styles.filterField}>
              Data
              <select value={filtroData} onChange={(e) => setFiltroData(e.target.value)} style={styles.filterControl}>
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
              {filteredOpportunities.length} oportunidade(s) após filtros
            </span>
            <Button
              variant="ghost"
              style={nowrapButtonStyle}
              onClick={() => {
                setFiltroDistrito("todos");
                setFiltroConcelho("todos");
                setFiltroCidade("");
                setFiltroTipo("todos");
                setFiltroEstado("todos");
                setFiltroOrigem("todos");
                setFiltroParticulares("todos");
                setFiltroData("todos");
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
              <Button variant="secondary" style={nowrapButtonStyle} onClick={handleManualSync} disabled={loading || Boolean(syncStatus)}>
                🔄 Atualizar Oportunidades
              </Button>
              <Button variant="ghost" style={nowrapButtonStyle} onClick={() => selectedOpportunity && openOpportunityDetail(selectedOpportunity)} disabled={!selectedOpportunity}>Abrir detalhe</Button>
            </div>
            {syncStatus ? <Loading label={syncStatus} /> : loading ? <Loading label="A carregar Radar..." /> : null}
          </div>

          {error ? (
            <p style={styles.errorText}>
              Falha ao carregar Radar: {error?.message || "erro desconhecido"}
            </p>
          ) : null}

          <Table
            columns={colunasTabela}
            rows={paginatedTableRows}
            emptyMessage="Sem oportunidades disponíveis"
            rowProps={(row, _index, computedKey) => {
              const opportunityId = String(row?.rawOpportunity?.id || row?.id || computedKey || "").trim();
              return {
                "data-opportunity-id": opportunityId || undefined,
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
                Página {tablePage} de {totalTablePages} ({tableRows.length} registos)
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  variant="ghost"
                  style={nowrapButtonStyle}
                  onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
                  disabled={tablePage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="ghost"
                  style={nowrapButtonStyle}
                  onClick={() => setTablePage((prev) => Math.min(totalTablePages, prev + 1))}
                  disabled={tablePage >= totalTablePages}
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

    </div>
  );
}

