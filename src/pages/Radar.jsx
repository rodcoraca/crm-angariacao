import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useAuthContext } from "../modules/auth/context";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import KpiCard from "../components/ui/KpiCard";
import Table from "../components/ui/Table";
import Loading from "../components/ui/Loading";
import SyncStatusBadge from "../components/providers/SyncStatusBadge";
import { notifyError, notifyInfo, notifySuccess } from "../components/ui/feedbackBus";
import {
  useRadar,
  mapRadarFlowViewModel,
  mapRadarKpisViewModel,
  mapRadarRoadmapViewModel,
  mapRadarTableViewModel,
  mapRadarTimelineViewModel
} from "../modules/radar";
import { createRadarStyles } from "./radarStyles";

export default function Radar() {
  const tableRef = useRef(null);
  const detailRef = useRef(null);
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
  const [filtroPrecoMin, setFiltroPrecoMin] = useState("");
  const [filtroPrecoMax, setFiltroPrecoMax] = useState("");
  const [filtroScoreMin, setFiltroScoreMin] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState("todos");
  const [filtroDistrito, setFiltroDistrito] = useState("todos");
  const [filtroConcelho, setFiltroConcelho] = useState("todos");
  const [filtroParticulares, setFiltroParticulares] = useState("todos");
  const [filtroImportados, setFiltroImportados] = useState("todos");
  const [filtroData, setFiltroData] = useState("todos");
  const styles = useMemo(() => createRadarStyles(theme), [theme]);
  const nowrapButtonStyle = useMemo(() => ({ whiteSpace: "nowrap", minWidth: "120px" }), []);
  const nowrapBadgeStyle = useMemo(() => ({ whiteSpace: "nowrap" }), []);

  useEffect(() => {
    if (selectedOpportunity && detailRef.current) {
      detailRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [selectedOpportunity]);

  useEffect(() => {
    console.log("Quantidade recebida no Radar.jsx:", (snapshot?.opportunities || []).length);
  }, [snapshot]);

  useEffect(() => {
    console.log("[Radar] snapshot.length:", Array.isArray(snapshot?.opportunities) ? snapshot.opportunities.length : 0);
  }, [snapshot]);

  const closeDetail = useCallback(() => {
    originalCloseDetail();
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [originalCloseDetail]);

  const handleRefreshRadar = useCallback(async () => {
    await reload();
    notifyInfo("Radar atualizado com oportunidades classificadas e ordenadas por score.");
  }, [reload]);

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
      notifyInfo("Estado operacional atualizado e score recalculado.");
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

  const timeline = useMemo(
    () => mapRadarTimelineViewModel(snapshot?.timeline || []),
    [snapshot]
  );

  const filterOptions = useMemo(() => {
    const opportunities = snapshot?.opportunities || [];
    const cidades = Array.from(new Set(opportunities.map((item) => String(item?.cidade || "").trim()).filter(Boolean))).sort();
    const tipos = Array.from(new Set(opportunities.map((item) => String(item?.tipo || "").trim()).filter(Boolean))).sort();
    const estados = Array.from(new Set(opportunities.map((item) => String(item?.estado || "").trim()).filter(Boolean))).sort();
    const origens = Array.from(new Set(opportunities.map((item) => String(item?.source || item?.origem || "").trim()).filter(Boolean))).sort();
    const distritos = Array.from(new Set(opportunities.map((item) => String(item?.distrito || "").trim()).filter(Boolean))).sort();
    const concelhos = Array.from(new Set(opportunities.map((item) => String(item?.concelho || "").trim()).filter(Boolean))).sort();
    return { cidades, tipos, estados, origens, distritos, concelhos };
  }, [snapshot]);

  const filteredOpportunities = useMemo(() => {
    const oportunidades = snapshot?.opportunities || [];
    if (!Array.isArray(snapshot?.opportunities)) {
      console.log("[Radar] condição que devolve []: !Array.isArray(snapshot?.opportunities)");
    }
    const cidadeLower = filtroCidade.trim().toLowerCase();

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
      const cidade = String(item?.cidade || "").toLowerCase();
      const tipo = String(item?.tipo || "");
      const estado = String(item?.estado || "");
      const origem = String(item?.source || item?.origem || "");
      const distrito = String(item?.distrito || "");
      const concelho = String(item?.concelho || "");

      if (cidadeLower && !cidade.includes(cidadeLower)) return false;
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
      if (filtroImportados !== "todos") {
        const isImported = item?.imported === true || String(item?.estado || "").toLowerCase() === "importado";
        if (filtroImportados === "importados" && !isImported) return false;
        if (filtroImportados === "nao_importados" && isImported) return false;
      }
      if (filtroData !== "todos" && !filtrarData(item)) return false;

      return true;
    });

    console.log("[Radar] resultado filter/useMemo (filteredOpportunities.length):", filtered.length);
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
    filtroImportados,
    filtroData
  ]);

  const tabela = useMemo(() => {
    const mappedTable = mapRadarTableViewModel(filteredOpportunities);
    console.log("[Radar] resultado mapTable (tabela.length):", mappedTable.length);
    return mappedTable;
  }, [filteredOpportunities]);

  const isImovirtualOpportunity = useCallback(
    (opportunity) => String(opportunity?.source || opportunity?.origem || "").toLowerCase() === "imovirtual",
    []
  );

  const isImportedOpportunity = useCallback(
    (opportunity) => opportunity?.imported === true,
    []
  );

  const isIgnoredOpportunity = useCallback(
    (opportunity) => String(opportunity?.estado || "").toLowerCase() === "ignorado",
    []
  );

  const colunasTabela = useMemo(() => [
    {
      key: "imovel",
      title: "Imóvel",
      render: (row) => (
            <button
              type="button"
          onClick={() => openDetail(row.rawOpportunity || null)}
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
    { key: "score", title: "Score" },
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
        const isImported = row.rawOpportunity?.imported === true || String(row.estado || "").toLowerCase() === "importado";
        const isIgnored = String(row.estado || "").toLowerCase() === "ignorado";
              return (
          <div style={styles.rowActions}>
            <Button size="sm" variant="ghost" style={nowrapButtonStyle} onClick={() => openDetail(row.rawOpportunity || null)}>
              Abrir detalhe
            </Button>
            <Button
              size="sm"
              variant="secondary"
              style={nowrapButtonStyle}
              disabled={importingId === row.id || isImported || isIgnored}
              onClick={() => handleImportOpportunity(row.rawOpportunity || null)}
            >
              {importingId === row.id ? "A importar..." : isImported ? "IMPORTADO" : "IMPORTAR"}
            </Button>
                  </div>
              );
      }
    }
  ], [
    handleImportOpportunity,
    importingId,
    isImovirtualOpportunity,
    nowrapBadgeStyle,
    nowrapButtonStyle,
    openDetail,
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

  useEffect(() => {
    console.log("[Radar] tableRows.length:", tableRows.length);
  }, [tableRows]);

  console.log("[Radar] primeiro objeto imediatamente antes do render:", tableRows[0] || null);

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

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Filtros operacionais</h2>
          <Badge variant="neutral" style={nowrapBadgeStyle}>Dados mock para homologação visual</Badge>
        </div>
        <Card style={styles.filterCard}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '15px',
            marginBottom: '15px'
          }}>
            <label style={styles.filterField}>
              Cidade
              <input
                value={filtroCidade}
                onChange={(event) => setFiltroCidade(event.target.value)}
                placeholder="Ex.: Lisboa"
                style={styles.filterControl}
                list="radar-cidades"
              />
              <datalist id="radar-cidades">
                {filterOptions.cidades.map((cidade) => (
                  <option key={cidade} value={cidade} />
                ))}
              </datalist>
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
              Distrito
              <select value={filtroDistrito} onChange={(event) => setFiltroDistrito(event.target.value)} style={styles.filterControl}>
                <option value="todos">Todos</option>
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
              Preço mínimo
              <input
                type="number"
                min="0"
                value={filtroPrecoMin}
                onChange={(event) => setFiltroPrecoMin(event.target.value)}
                placeholder="0"
                style={styles.filterControl}
              />
            </label>

            <label style={styles.filterField}>
              Preço máximo
              <input
                type="number"
                min="0"
                value={filtroPrecoMax}
                onChange={(event) => setFiltroPrecoMax(event.target.value)}
                placeholder="900000"
                style={styles.filterControl}
              />
            </label>

            <label style={styles.filterField}>
              Score mínimo
              <input
                type="number"
                min="0"
                max="100"
                value={filtroScoreMin}
                onChange={(event) => setFiltroScoreMin(event.target.value)}
                placeholder="70"
                style={styles.filterControl}
              />
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
              Importação
              <select value={filtroImportados} onChange={(e) => setFiltroImportados(e.target.value)} style={styles.filterControl}>
                <option value="todos">Todos</option>
                <option value="importados">Importados</option>
                <option value="nao_importados">Não importados</option>
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
                setFiltroCidade("");
                setFiltroTipo("todos");
                setFiltroEstado("todos");
                setFiltroOrigem("todos");
                setFiltroDistrito("todos");
                setFiltroConcelho("todos");
                setFiltroPrecoMin("");
                setFiltroPrecoMax("");
                setFiltroScoreMin("");
                setFiltroParticulares("todos");
                setFiltroImportados("todos");
                setFiltroData("todos");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </Card>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Indicadores</h2>
        <div style={styles.cardGrid}>
          {kpis.map((item) => (
            <KpiCard
              key={item.id}
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

      <section style={styles.section} ref={tableRef}>
        <h2 style={styles.sectionTitle}>Tabela de oportunidades</h2>
        <Card style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <div style={styles.actionRow}>
              <Button variant="primary" style={nowrapButtonStyle} onClick={handleRefreshRadar} disabled={loading}>
                Atualizar Radar
              </Button>
              <Button variant="ghost" style={nowrapButtonStyle} onClick={() => selectedOpportunity && openDetail(selectedOpportunity)} disabled={!selectedOpportunity}>Abrir detalhe</Button>
              <Button
                variant="secondary"
                style={nowrapButtonStyle}
                onClick={() => handleImportOpportunity(selectedOpportunity)}
                disabled={!selectedOpportunity || importingId === selectedOpportunity?.id || isImportedOpportunity(selectedOpportunity) || isIgnoredOpportunity(selectedOpportunity)}
              >
                {importingId === selectedOpportunity?.id ? "A importar..." : isImportedOpportunity(selectedOpportunity) ? "IMPORTADO" : "Importar para Leads"}
              </Button>
            </div>
            {loading ? <Loading label="A preparar demonstração Radar..." /> : null}
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
          />
        </Card>
      </section>

      {selectedOpportunity ? (
        <section style={styles.section} ref={detailRef}>
          <h2 style={styles.sectionTitle}>Detalhe da oportunidade</h2>
          <Card style={{ ...styles.detailCard, opacity: String(selectedOpportunity.estado || "").toLowerCase() === "importado" ? 0.6 : 1 }}>
            <div style={styles.detailHeader}>
              <strong style={styles.detailTitle}>{selectedOpportunity.titulo}</strong>
              <Badge variant="primary" style={{ marginLeft: '10px', fontSize: '1.1em', ...nowrapBadgeStyle }}>{selectedOpportunity.preco}</Badge>
              <Badge variant="warning" style={{ marginLeft: '10px', ...nowrapBadgeStyle }}>Score {selectedOpportunity.score}</Badge>
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
              <Button variant="secondary" style={nowrapButtonStyle} onClick={() => handleImportOpportunity(selectedOpportunity)} disabled={importingId === selectedOpportunity.id || isImportedOpportunity(selectedOpportunity) || isIgnoredOpportunity(selectedOpportunity)}>
                {importingId === selectedOpportunity.id ? "A importar..." : isImportedOpportunity(selectedOpportunity) ? "IMPORTADO" : "Importar para Leads"}
              </Button>
              <Button variant="ghost" style={nowrapButtonStyle} onClick={closeDetail}>Fechar detalhe</Button>
            </div>
          </Card>
        </section>
      ) : null}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Timeline operacional</h2>
        <Card style={styles.timelineCard}>
          {timeline.length === 0 ? (
            <p style={styles.timelineEmpty}>Sem eventos na timeline.</p>
          ) : (
            timeline.map((event) => {
              const estado = String(event.estado || "").toLowerCase();
              const variant =
                estado === "importada"
                  ? "success"
                  : estado === "analisada"
                    ? "warning"
                    : estado === "ignorada"
                      ? "neutral"
                      : "primary";

              return (
                <div key={event.id} style={styles.timelineItem}>
                  <div style={styles.timelineItemInfo}>
                    <strong style={styles.timelineItemTitle}>{event.oportunidadeTitulo}</strong>
                    <span style={styles.timelineItemEvent}>{event.evento}</span>
                  </div>
                  <div style={styles.timelineItemMeta}>
                    <Badge variant={variant} style={nowrapBadgeStyle}>{event.estado}</Badge>
                    <span style={styles.timelineDate}>{event.data}</span>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Roadmap do Radar</h2>
        <Card>
          <div style={styles.roadmapList}>
            {roadmap.map((item, index) => (
              <div key={item.id} style={styles.roadmapItem}>
                <Badge variant="success" style={{ ...styles.roadmapStep, ...nowrapBadgeStyle }}>{String(index + 1).padStart(2, "0")}</Badge>
                <span>{item.label}</span>
                {index < roadmap.length - 1 ? <Badge variant="neutral" style={nowrapBadgeStyle}>↓</Badge> : null}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Fluxo operacional</h2>
        <div style={styles.flowGrid}>
          {fluxo.map((etapa, index) => (
            <Card key={etapa.id} style={styles.flowCard}>
              <Badge variant="primary" style={{ ...styles.flowStepBadge, ...nowrapBadgeStyle }}>{`Etapa ${index + 1}`}</Badge>
              <h3 style={styles.flowName}>{etapa.label}</h3>
              {index < fluxo.length - 1 ? <Badge variant="neutral" style={{ ...styles.flowStepBadge, ...nowrapBadgeStyle }}>↓</Badge> : null}
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <p style={styles.footer}>
          Estrutura preparada para futuras integrações com serviços de recolha de anúncios,
          sem implementação de conectores ou consultas externas nesta fase.
        </p>
      </Card>
    </div>
  );
}

