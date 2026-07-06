import { useMemo, useState } from "react";
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
    importSelectedToLeads
  } = useRadar();
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPrecoMin, setFiltroPrecoMin] = useState("");
  const [filtroPrecoMax, setFiltroPrecoMax] = useState("");
  const [filtroScoreMin, setFiltroScoreMin] = useState("");

  async function handleRefreshRadar() {
    await reload();
    notifyInfo("Radar atualizado com oportunidades classificadas e ordenadas por score.");
  }

  async function handleImportOpportunity(opportunity) {
    const result = await importSelectedToLeads({ opportunity, user });

    if (result?.ok) {
      notifySuccess(result.message || "Lead importada com sucesso.");
      await reload();
      closeDetail();
      return;
    }

    notifyError(result?.message || "Não foi possível importar para Leads.");
  }

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

  const colunasTabela = [
    {
      key: "imovel",
      title: "Imóvel",
      render: (row) => (
        <button
          type="button"
          onClick={() => openDetail(row.rawOpportunity || null)}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            margin: 0,
            color: theme.colors.primary,
            fontWeight: 700,
            cursor: "pointer",
            textAlign: "left"
          }}
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
        <div style={{ display: "flex", gap: theme.spacing.xs, flexWrap: "wrap" }}>
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
  ];

  const styles = {
    page: {
      display: "grid",
      gap: theme.spacing.lg
    },
    hero: {
      display: "grid",
      gap: theme.spacing.sm,
      background: `linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.surfaceSoft} 100%)`
    },
    title: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "2rem",
      lineHeight: 1.1
    },
    subtitle: {
      margin: 0,
      color: theme.colors.primary,
      fontSize: "1.05rem",
      fontWeight: 700
    },
    description: {
      margin: 0,
      color: theme.colors.muted,
      maxWidth: "72ch",
      lineHeight: 1.6
    },
    sectionTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.2rem"
    },
    cardsGrid: {
      display: "grid",
      gap: theme.spacing.md,
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
    },
    flowGrid: {
      display: "grid",
      gap: theme.spacing.sm,
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
    },
    flowCard: {
      display: "grid",
      gap: theme.spacing.xs,
      textAlign: "center",
      alignContent: "center",
      minHeight: "120px"
    },
    flowName: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1rem"
    },
    roadList: {
      display: "grid",
      gap: theme.spacing.sm
    },
    roadItem: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.sm,
      color: theme.colors.text,
      fontWeight: 700
    },
    actionRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    tableHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    actionsCard: {
      display: "grid",
      gap: theme.spacing.sm
    },
    toolbar: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      color: theme.colors.muted
    },
    footer: {
      textAlign: "center",
      color: theme.colors.muted,
      margin: 0,
      lineHeight: 1.5
    }
  };

  return (
    <div style={styles.page}>
      <Card style={styles.hero}>
        <Badge variant="primary" style={{ width: "fit-content" }}>Radar Beta</Badge>
        <h1 style={styles.title}>🎯 OSFlow Radar</h1>
        <p style={styles.subtitle}>As oportunidades não esperam. O Radar encontra-as primeiro.</p>
        <p style={styles.description}>
          O Radar será responsável por identificar automaticamente novas oportunidades de angariação provenientes
          de múltiplas fontes, organizando-as para análise e importação para o CRM.
        </p>
      </Card>

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Indicadores</h2>
        <div style={styles.cardsGrid}>
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

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Tabela demonstrativa</h2>
        <Card style={{ display: "grid", gap: theme.spacing.sm }}>
          <div style={styles.tableHeader}>
            <Badge variant="neutral">Dados mock para homologação visual</Badge>
            <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center" }}>
              <Button variant="primary" onClick={handleRefreshRadar} disabled={loading}>
                Atualizar Radar
              </Button>
              {loading ? <Loading label="A preparar demonstração Radar..." /> : null}
            </div>
          </div>

          {error ? (
            <p style={{ margin: 0, color: theme.colors.danger }}>
              Falha ao carregar Radar: {error?.message || "erro desconhecido"}
            </p>
          ) : null}

          <Table
            columns={colunasTabela}
            rows={tabela.map((row, index) => ({
              ...row,
              id: row.id || `radar-row-${index}`,
              rawOpportunity:
                (filteredOpportunities || []).find((item) => String(item?.id) === String(row?.id)) ||
                filteredOpportunities?.[index] ||
                null
            }))}
            emptyMessage="Sem oportunidades disponíveis"
          />
        </Card>
      </section>

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Filtros operacionais</h2>
        <Card style={{ display: "grid", gap: theme.spacing.sm }}>
          <div style={{ display: "grid", gap: theme.spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <label style={{ display: "grid", gap: 6, color: theme.colors.muted }}>
              Cidade
              <input
                value={filtroCidade}
                onChange={(event) => setFiltroCidade(event.target.value)}
                placeholder="Ex.: Lisboa"
                style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.sm, padding: "8px 10px" }}
                list="radar-cidades"
              />
              <datalist id="radar-cidades">
                {filterOptions.cidades.map((cidade) => (
                  <option key={cidade} value={cidade} />
                ))}
              </datalist>
            </label>

            <label style={{ display: "grid", gap: 6, color: theme.colors.muted }}>
              Tipo
              <select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)} style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.sm, padding: "8px 10px" }}>
                <option value="todos">Todos</option>
                {filterOptions.tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, color: theme.colors.muted }}>
              Estado
              <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)} style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.sm, padding: "8px 10px" }}>
                <option value="todos">Todos</option>
                {filterOptions.estados.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, color: theme.colors.muted }}>
              Preço mínimo
              <input
                type="number"
                min="0"
                value={filtroPrecoMin}
                onChange={(event) => setFiltroPrecoMin(event.target.value)}
                placeholder="0"
                style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.sm, padding: "8px 10px" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, color: theme.colors.muted }}>
              Preço máximo
              <input
                type="number"
                min="0"
                value={filtroPrecoMax}
                onChange={(event) => setFiltroPrecoMax(event.target.value)}
                placeholder="900000"
                style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.sm, padding: "8px 10px" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, color: theme.colors.muted }}>
              Score mínimo
              <input
                type="number"
                min="0"
                max="100"
                value={filtroScoreMin}
                onChange={(event) => setFiltroScoreMin(event.target.value)}
                placeholder="70"
                style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.sm, padding: "8px 10px" }}
              />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" }}>
            <span style={{ color: theme.colors.muted, fontSize: "0.9rem" }}>
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

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Fluxo operacional</h2>
        <div style={styles.flowGrid}>
          {fluxo.map((etapa, index) => (
            <Card key={etapa.id} style={styles.flowCard}>
              <Badge variant="primary" style={{ width: "fit-content", margin: "0 auto" }}>{`Etapa ${index + 1}`}</Badge>
              <h3 style={styles.flowName}>{etapa.label}</h3>
              {index < fluxo.length - 1 ? <Badge variant="neutral" style={{ width: "fit-content", margin: "0 auto" }}>↓</Badge> : null}
            </Card>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Roadmap do Radar</h2>
        <Card>
          <div style={styles.roadList}>
            {roadmap.map((item, index) => (
              <div key={item.id} style={styles.roadItem}>
                <Badge variant="success" style={{ minWidth: "44px" }}>{String(index + 1).padStart(2, "0")}</Badge>
                <span>{item.label}</span>
                {index < roadmap.length - 1 ? <Badge variant="neutral">↓</Badge> : null}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Ações</h2>
        <Card style={styles.actionsCard}>
          <div style={styles.actionRow}>
            <Button variant="primary" onClick={handleRefreshRadar} disabled={loading}>Atualizar Radar</Button>
            <Button variant="ghost" onClick={() => selectedOpportunity && openDetail(selectedOpportunity)} disabled={!selectedOpportunity}>Abrir detalhe</Button>
            <Button
              variant="secondary"
              onClick={() => handleImportOpportunity(selectedOpportunity)}
              disabled={!selectedOpportunity || importingId === selectedOpportunity?.id}
            >
              {importingId === selectedOpportunity?.id ? "A importar..." : "Importar para Leads"}
            </Button>
          </div>
        </Card>
      </section>

      {selectedOpportunity ? (
        <section style={{ display: "grid", gap: theme.spacing.md }}>
          <h2 style={styles.sectionTitle}>Detalhe da oportunidade</h2>
          <Card style={{ display: "grid", gap: theme.spacing.sm }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" }}>
              <strong style={{ color: theme.colors.text }}>{selectedOpportunity.titulo}</strong>
              <Badge variant="warning">Score {selectedOpportunity.score}</Badge>
            </div>

            <p style={{ margin: 0, color: theme.colors.text }}><strong>Tipo:</strong> {selectedOpportunity.tipo || "-"}</p>
            <p style={{ margin: 0, color: theme.colors.text }}><strong>Morada:</strong> {selectedOpportunity.morada || "-"}</p>
            <p style={{ margin: 0, color: theme.colors.text }}><strong>Cidade:</strong> {selectedOpportunity.cidade || "-"}</p>
            <p style={{ margin: 0, color: theme.colors.text }}><strong>Área:</strong> {selectedOpportunity.area || "-"} m²</p>
            <p style={{ margin: 0, color: theme.colors.text }}><strong>Quartos:</strong> {selectedOpportunity.quartos ?? "-"}</p>
            <p style={{ margin: 0, color: theme.colors.text }}><strong>Origem:</strong> {selectedOpportunity.origem || "-"}</p>
            <p style={{ margin: 0, color: theme.colors.text }}><strong>URL:</strong> {selectedOpportunity.url || "-"}</p>

            <div style={{ display: "flex", gap: theme.spacing.sm, flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={() => handleImportOpportunity(selectedOpportunity)} disabled={importingId === selectedOpportunity.id}>
                {importingId === selectedOpportunity.id ? "A importar..." : "Importar para Leads"}
              </Button>
              <Button variant="ghost" onClick={closeDetail}>Fechar detalhe</Button>
            </div>
          </Card>
        </section>
      ) : null}

      <section style={{ display: "grid", gap: theme.spacing.md }}>
        <h2 style={styles.sectionTitle}>Timeline operacional</h2>
        <Card style={{ display: "grid", gap: theme.spacing.sm }}>
          {timeline.length === 0 ? (
            <p style={{ margin: 0, color: theme.colors.muted }}>Sem eventos na timeline.</p>
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
                <div key={event.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm, border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.sm, padding: "10px 12px", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 2 }}>
                    <strong style={{ color: theme.colors.text }}>{event.oportunidadeTitulo}</strong>
                    <span style={{ color: theme.colors.muted, fontSize: "0.9rem" }}>{event.evento}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
                    <Badge variant={variant}>{event.estado}</Badge>
                    <span style={{ color: theme.colors.muted, fontSize: "0.85rem" }}>{event.data}</span>
                  </div>
                </div>
              );
            })
          )}
        </Card>
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
