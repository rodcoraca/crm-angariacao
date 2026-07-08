import { useCallback, useMemo, useState } from "react";
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
  mapRadarTableViewModel,
  mapRadarTimelineViewModel
} from "../modules/radar";
import { createRadarStyles } from "./radarStyles";

export default function Radar() {
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
    closeDetail,
    importSelectedToLeads,
    updateOpportunityState
  } = useRadar();
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPrecoMin, setFiltroPrecoMin] = useState("");
  const [filtroPrecoMax, setFiltroPrecoMax] = useState("");
  const [filtroScoreMin, setFiltroScoreMin] = useState("");
  const styles = useMemo(() => createRadarStyles(theme), [theme]);

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
    return { cidades, tipos, estados };
  }, [snapshot]);

  const filteredOpportunities = useMemo(() => {
    const oportunidades = snapshot?.opportunities || [];
    const cidadeLower = filtroCidade.trim().toLowerCase();
    const precoMin = filtroPrecoMin ? Number(filtroPrecoMin) : null;
    const precoMax = filtroPrecoMax ? Number(filtroPrecoMax) : null;
    const scoreMin = filtroScoreMin ? Number(filtroScoreMin) : null;

    return oportunidades.filter((item) => {
      const cidade = String(item?.cidade || "").toLowerCase();
      const tipo = String(item?.tipo || "");
      const estado = String(item?.estado || "");
      const preco = Number(item?.preco || 0);
      const score = Number(item?.score || 0);

      if (cidadeLower && !cidade.includes(cidadeLower)) return false;
      if (filtroTipo !== "todos" && tipo !== filtroTipo) return false;
      if (filtroEstado !== "todos" && estado !== filtroEstado) return false;
      if (precoMin !== null && Number.isFinite(precoMin) && preco < precoMin) return false;
      if (precoMax !== null && Number.isFinite(precoMax) && preco > precoMax) return false;
      if (scoreMin !== null && Number.isFinite(scoreMin) && score < scoreMin) return false;

      return true;
    });
  }, [snapshot, filtroCidade, filtroTipo, filtroEstado, filtroPrecoMin, filtroPrecoMax, filtroScoreMin]);

  const tabela = useMemo(
    () => mapRadarTableViewModel(filteredOpportunities),
    [filteredOpportunities]
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
          {row.imovel}
        </button>
      )
    },
    { key: "localizacao", title: "Localização" },
    { key: "preco", title: "Preço" },
    { key: "publicado", title: "Publicado" },
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

        return <Badge variant={variant}>{row.estado}</Badge>;
      }
    },
    {
      key: "acoes",
      title: "Ações",
      render: (row) => (
        <div style={styles.rowActions}>
          <Button size="sm" variant="ghost" onClick={() => openDetail(row.rawOpportunity || null)}>
            Abrir detalhe
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={importingId === row.id}
            onClick={() => handleImportOpportunity(row.rawOpportunity || null)}
          >
            {importingId === row.id ? "A importar..." : "Importar para Leads"}
          </Button>
        </div>
      )
    }
  ], [handleImportOpportunity, importingId, openDetail, styles.linkButton, styles.rowActions]);

  const tableRows = useMemo(
    () => tabela.map((row, index) => ({
      ...row,
      id: row.id || `radar-row-${index}`,
      rawOpportunity:
        (filteredOpportunities || []).find((item) => String(item?.id) === String(row?.id)) ||
        filteredOpportunities?.[index] ||
        null
    })),
    [filteredOpportunities, tabela]
  );

  return (
    <div style={styles.page}>
      <Card style={styles.hero}>
        <Badge variant="primary" style={styles.heroBadge}>Radar Beta</Badge>
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
          <Badge variant="neutral">Dados mock para homologação visual</Badge>
        </div>
        <Card style={styles.filterCard}>
          <div style={styles.filtersGrid}>
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
          </div>

          <div style={styles.filterFooter}>
            <span style={styles.filterInfo}>
              {filteredOpportunities.length} oportunidade(s) após filtros
            </span>
            <Button
              variant="ghost"
              onClick={() => {
                setFiltroCidade("");
                setFiltroTipo("todos");
                setFiltroEstado("todos");
                setFiltroPrecoMin("");
                setFiltroPrecoMax("");
                setFiltroScoreMin("");
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

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Tabela de oportunidades</h2>
        <Card style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <div style={styles.actionRow}>
              <Button variant="primary" onClick={handleRefreshRadar} disabled={loading}>
                Atualizar Radar
              </Button>
              <Button variant="ghost" onClick={() => selectedOpportunity && openDetail(selectedOpportunity)} disabled={!selectedOpportunity}>Abrir detalhe</Button>
              <Button
                variant="secondary"
                onClick={() => handleImportOpportunity(selectedOpportunity)}
                disabled={!selectedOpportunity || importingId === selectedOpportunity?.id}
              >
                {importingId === selectedOpportunity?.id ? "A importar..." : "Importar para Leads"}
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
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Detalhe da oportunidade</h2>
          <Card style={styles.detailCard}>
            <div style={styles.detailHeader}>
              <strong style={styles.detailTitle}>{selectedOpportunity.titulo}</strong>
              <Badge variant="warning">Score {selectedOpportunity.score}</Badge>
            </div>

            <p style={styles.detailText}><strong>Tipo:</strong> {selectedOpportunity.tipo || "-"}</p>
            <p style={styles.detailText}><strong>Morada:</strong> {selectedOpportunity.morada || "-"}</p>
            <p style={styles.detailText}><strong>Cidade:</strong> {selectedOpportunity.cidade || "-"}</p>
            <p style={styles.detailText}><strong>Área:</strong> {selectedOpportunity.area || "-"} m²</p>
            <p style={styles.detailText}><strong>Quartos:</strong> {selectedOpportunity.quartos ?? "-"}</p>
            <p style={styles.detailText}><strong>Origem:</strong> {selectedOpportunity.origem || "-"}</p>
            <p style={styles.detailText}><strong>URL:</strong> {selectedOpportunity.url || "-"}</p>

            <label style={styles.detailField}>
              Estado operacional
              <select
                value={String(selectedOpportunity.estado || "novo").toLowerCase()}
                onChange={handleChangeOperationalState}
                style={styles.detailSelect}
              >
                <option value="novo">Nova</option>
                <option value="analisado">Em análise</option>
                <option value="importado">Importada</option>
                <option value="ignorado">Ignorada</option>
              </select>
            </label>

            <div style={styles.detailActions}>
              <Button variant="secondary" onClick={() => handleImportOpportunity(selectedOpportunity)} disabled={importingId === selectedOpportunity.id}>
                {importingId === selectedOpportunity.id ? "A importar..." : "Importar para Leads"}
              </Button>
              <Button variant="ghost" onClick={closeDetail}>Fechar detalhe</Button>
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
                    <Badge variant={variant}>{event.estado}</Badge>
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
                <Badge variant="success" style={styles.roadmapStep}>{String(index + 1).padStart(2, "0")}</Badge>
                <span>{item.label}</span>
                {index < roadmap.length - 1 ? <Badge variant="neutral">↓</Badge> : null}
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
              <Badge variant="primary" style={styles.flowStepBadge}>{`Etapa ${index + 1}`}</Badge>
              <h3 style={styles.flowName}>{etapa.label}</h3>
              {index < fluxo.length - 1 ? <Badge variant="neutral" style={styles.flowStepBadge}>↓</Badge> : null}
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

