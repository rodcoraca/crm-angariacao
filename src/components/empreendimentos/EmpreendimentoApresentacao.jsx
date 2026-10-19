import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import { useTheme } from "../../theme/ThemeContext";
import {
  EMPREENDIMENTO_DOCUMENT_CATEGORIES as CATEGORIAS_DOCUMENTOS_PADRAO,
  mapCategoriaEmpreendimentoLabel
} from "../../modules/empreendimentos/services/empreendimentoDocumentosService";
import {
  calcularCondicoesPagamentoPorUnidade,
  formatarValorMonetario
} from "../../modules/empreendimentos/services/unidadesService";
import { useState } from "react";

const formatarData = (value) => {
  if (!value) return "—";
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-PT");
};

const formatarLocalizacao = (empreendimento) => (
  [empreendimento?.morada, empreendimento?.freguesia, empreendimento?.concelho, empreendimento?.distrito]
    .filter(Boolean)
    .join(" · ") || "Localização não indicada"
);

const formatarValorUnidade = (value) => (
  value === null || value === undefined || value === "" ? "—" : value
);

function Secao({ eyebrow, titulo, children, style }) {
  return (
    <section style={{ marginTop: 28, ...style }}>
      <div style={{ marginBottom: 14 }}>
        {eyebrow ? <div style={{ color: "var(--os-color-primary)", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>{eyebrow}</div> : null}
        <h2 style={{ margin: "5px 0 0", fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.02em" }}>{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function EstadoSecao({ tipo, mensagem }) {
  const textos = {
    loading: "A carregar informação…",
    error: mensagem || "Não foi possível carregar esta informação.",
    empty: mensagem || "Ainda não existem dados disponíveis."
  };

  return (
    <div
      role={tipo === "error" ? "alert" : undefined}
      style={{
        border: `1px solid ${tipo === "error" ? "#efc4c4" : "var(--os-color-border)"}`,
        borderRadius: 14,
        padding: "18px 20px",
        color: tipo === "error" ? "#a13b3b" : "var(--os-color-muted)",
        background: tipo === "error" ? "#fff8f8" : "var(--os-color-surface-soft)",
        fontSize: 14
      }}
    >
      {textos[tipo]}
    </div>
  );
}

function InfoItem({ label, value, accent = false }) {
  return (
    <div style={{ padding: "15px 16px", borderLeft: `2px solid ${accent ? "var(--os-color-primary)" : "var(--os-color-border)"}`, background: "var(--os-color-surface-soft)" }}>
      <div style={{ color: "var(--os-color-muted)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 7, fontSize: 15, fontWeight: 700 }}>{value || "—"}</div>
    </div>
  );
}

export default function EmpreendimentoApresentacao({
  empreendimento = null,
  cliente = null,
  condicoes = [],
  unidades = [],
  documentos = {},
  categorias = CATEGORIAS_DOCUMENTOS_PADRAO,
  EMPREENDIMENTO_DOCUMENT_CATEGORIES = null,
  loadingCondicoes = false,
  loadingUnidades = false,
  loadingDocumentos = false,
  errorCondicoes = "",
  errorUnidades = "",
  errorDocumentos = "",
  podeConsultarDocumentos = true,
  documentosAcesso = null,
  onBack
}) {
  const theme = useTheme();
  const categoriasApresentacao = EMPREENDIMENTO_DOCUMENT_CATEGORIES || categorias || CATEGORIAS_DOCUMENTOS_PADRAO;
  const acessoDocumentos = documentosAcesso === null ? podeConsultarDocumentos : documentosAcesso;
  const nomeEmpreendimento = empreendimento?.nome || "Empreendimento sem nome";
  const nomeCliente = cliente?.nome_designacao || cliente?.nome || "Cliente não indicado";
  const [unidadeSelecionadaId, setUnidadeSelecionadaId] = useState(null);
  const unidadeSelecionada = unidades.find((unidade) => unidade.id === unidadeSelecionadaId) || null;
  const resumoUnidadeSelecionada = unidadeSelecionada
    ? calcularCondicoesPagamentoPorUnidade({ precoVenda: unidadeSelecionada.preco_venda, condicoes })
    : null;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "8px 0 48px", color: theme.colors.text, fontFamily: theme.typography.fontFamily }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", padding: "20px 0 24px", borderBottom: `1px solid ${theme.colors.border}` }}>
        <div>
          <div style={{ color: theme.colors.primary, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>Consulta comercial</div>
          <h1 style={{ margin: "9px 0 8px", fontSize: "clamp(30px, 5vw, 48px)", lineHeight: 1, letterSpacing: "-0.045em", fontWeight: 800 }}>{nomeEmpreendimento}</h1>
          <p style={{ margin: 0, color: theme.colors.muted, fontSize: 15 }}>Apresentação reservada · {nomeCliente}</p>
        </div>
        <Button variant="light" onClick={onBack} leftIcon="←">Voltar à listagem</Button>
      </div>

      {!empreendimento ? (
        <div style={{ marginTop: 28 }}><EmptyState title="Empreendimento não selecionado" description="Selecione um empreendimento para consultar a apresentação comercial." /></div>
      ) : (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(260px, 0.65fr)", gap: 16, marginTop: 24 }}>
            <div style={{ padding: 24, borderRadius: 18, background: "linear-gradient(135deg, var(--os-color-primary), #18384a)", color: "#fff", minHeight: 170, boxSizing: "border-box" }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.72 }}>Visão geral</div>
              <h2 style={{ margin: "40px 0 8px", fontSize: 25, letterSpacing: "-0.025em" }}>{formatarLocalizacao(empreendimento)}</h2>
              <div style={{ opacity: 0.78, fontSize: 14 }}>Cliente associado: {nomeCliente}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <InfoItem label="Início das obras" value={formatarData(empreendimento.inicio_obras)} accent />
              <InfoItem label="Entrega prevista" value={formatarData(empreendimento.previsao_entrega)} />
            </div>
          </section>

          {(loadingCondicoes || errorCondicoes || condicoes.length === 0) ? (
            <Secao eyebrow="Plano financeiro" titulo="Condições de pagamento">
              {loadingCondicoes ? <EstadoSecao tipo="loading" /> : errorCondicoes ? <EstadoSecao tipo="error" mensagem={errorCondicoes} /> : <EstadoSecao tipo="empty" mensagem="Ainda não existem condições de pagamento configuradas." />}
            </Secao>
          ) : null}

          <Secao eyebrow="Inventário" titulo="Unidades disponíveis">
            {loadingUnidades ? <EstadoSecao tipo="loading" /> : errorUnidades ? <EstadoSecao tipo="error" mensagem={errorUnidades} /> : unidades.length === 0 ? <EstadoSecao tipo="empty" mensagem="Não existem unidades disponíveis para consulta." /> : (
              <div style={{ overflowX: "hidden", border: `1px solid ${theme.colors.border}`, borderRadius: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead><tr style={{ background: theme.colors.surfaceSoft, textAlign: "left" }}><th style={{ width: "12%", padding: "10px 12px", color: theme.colors.muted, fontSize: 11 }}>Fração</th><th style={{ width: "12%", padding: "10px 12px", color: theme.colors.muted, fontSize: 11 }}>Tipologia</th><th style={{ width: "13%", padding: "10px 12px", color: theme.colors.muted, fontSize: 11 }}>Área</th><th style={{ width: "11%", padding: "10px 12px", color: theme.colors.muted, fontSize: 11 }}>Casas de banho</th><th style={{ width: "11%", padding: "10px 12px", color: theme.colors.muted, fontSize: 11 }}>Garagem</th><th style={{ width: "17%", padding: "10px 12px", color: theme.colors.muted, fontSize: 11 }}>Preço</th><th style={{ width: "12%", padding: "10px 12px", color: theme.colors.muted, fontSize: 11 }}>Planta</th><th style={{ width: "12%", padding: "10px 12px", color: theme.colors.muted, fontSize: 11 }}>Condições</th></tr></thead>
                  <tbody>{unidades.map((unidade, index) => {
                    const selecionada = unidade.id === unidadeSelecionadaId;
                    return <tr key={unidade.id || `${unidade.fracao}-${index}`} onClick={() => setUnidadeSelecionadaId(unidade.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setUnidadeSelecionadaId(unidade.id); } }} tabIndex={0} aria-selected={selecionada} style={{ borderTop: `1px solid ${theme.colors.border}`, background: selecionada ? theme.colors.surfaceSoft : theme.colors.surface, cursor: "pointer" }}><td style={{ padding: "10px 12px", fontWeight: 800, overflowWrap: "anywhere" }}>{unidade.fracao || "—"}</td><td style={{ padding: "10px 12px", overflowWrap: "anywhere" }}>{unidade.tipologia || "—"}</td><td style={{ padding: "10px 12px", overflowWrap: "anywhere" }}>{unidade.area_bruta_privativa != null ? `${unidade.area_bruta_privativa} m²` : "—"}</td><td style={{ padding: "10px 12px", overflowWrap: "anywhere" }}>{formatarValorUnidade(unidade.casas_banho)}</td><td style={{ padding: "10px 12px", overflowWrap: "anywhere" }}>{formatarValorUnidade(unidade.lugares_garagem)}</td><td style={{ padding: "10px 12px", overflowWrap: "anywhere" }}>{formatarValorMonetario(unidade.preco_venda)}</td><td style={{ padding: "10px 12px", overflowWrap: "anywhere" }}>{unidade.planta?.url ? <a href={unidade.planta.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} style={{ color: theme.colors.primary, fontWeight: 700, textDecoration: "none" }}>{unidade.planta.nome || "Abrir planta"}</a> : <span style={{ color: theme.colors.muted }}>—</span>}</td><td style={{ padding: "10px 12px" }}><button type="button" onClick={(event) => { event.stopPropagation(); setUnidadeSelecionadaId(unidade.id); }} style={{ border: 0, background: "transparent", color: theme.colors.primary, cursor: "pointer", fontWeight: 700, padding: 0 }}>Consultar</button></td></tr>;
                  })}</tbody>
                </table>
              </div>
            )}
          </Secao>

          {unidadeSelecionada && resumoUnidadeSelecionada ? (
            <aside aria-label={`Detalhe da fração ${unidadeSelecionada.fracao || "selecionada"}`} style={{ marginTop: 24, padding: 16, border: `1px solid ${theme.colors.border}`, borderRadius: 14, background: theme.colors.surfaceSoft }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Fração {unidadeSelecionada.fracao || "—"}</h3>
                  <div style={{ marginTop: 4, color: theme.colors.muted, fontSize: 13 }}>Consulta comercial · condições herdadas do empreendimento</div>
                </div>
                <Button variant="light" size="sm" onClick={() => setUnidadeSelecionadaId(null)}>Fechar</Button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 12, fontSize: 13 }}>
                <span>Tipologia: <strong>{unidadeSelecionada.tipologia || "—"}</strong></span>
                <span>Área: <strong>{unidadeSelecionada.area_bruta_privativa != null ? `${unidadeSelecionada.area_bruta_privativa} m²` : "—"}</strong></span>
                <span>Casas de banho: <strong>{formatarValorUnidade(unidadeSelecionada.casas_banho)}</strong></span>
                <span>Lugares de garagem: <strong>{formatarValorUnidade(unidadeSelecionada.lugares_garagem)}</strong></span>
                <span>Preço: <strong>{formatarValorMonetario(resumoUnidadeSelecionada.preco_venda)}</strong></span>
                <span>Planta: {unidadeSelecionada.planta?.url ? <a href={unidadeSelecionada.planta.url} target="_blank" rel="noreferrer" style={{ color: theme.colors.primary, fontWeight: 700 }}>Abrir</a> : <strong>—</strong>}</span>
              </div>
              <div style={{ marginTop: 14, overflowX: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead><tr style={{ textAlign: "left", background: theme.colors.surface }}><th style={{ width: "34%", padding: "8px 10px", fontSize: 11, color: theme.colors.muted }}>Etapa</th><th style={{ width: "30%", padding: "8px 10px", fontSize: 11, color: theme.colors.muted }}>Condição</th><th style={{ width: "36%", padding: "8px 10px", fontSize: 11, color: theme.colors.muted, textAlign: "right" }}>Montante</th></tr></thead>
                  <tbody>{resumoUnidadeSelecionada.etapas.map((etapa, index) => <tr key={`${unidadeSelecionada.id || unidadeSelecionada.fracao}-${etapa.nome_etapa}-${index}`} style={{ borderTop: `1px solid ${theme.colors.border}` }}><td style={{ padding: "8px 10px", overflowWrap: "anywhere" }}>{etapa.nome_etapa}</td><td style={{ padding: "8px 10px", overflowWrap: "anywhere" }}>{!etapa.tipo_suportado || !etapa.valor_valido ? "Condição inválida" : etapa.tipo_valor === "percentual" ? `${etapa.valor}%` : formatarValorMonetario(etapa.valor)}</td><td style={{ padding: "8px 10px", textAlign: "right", overflowWrap: "anywhere" }}>{etapa.montante === null ? "Não calculável" : formatarValorMonetario(etapa.montante)}</td></tr>)}</tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, fontSize: 13 }}>
                <span>Estado: <strong>{resumoUnidadeSelecionada.estado}</strong></span>
                <span>Total{resumoUnidadeSelecionada.totais_parciais ? " parcial" : ""}: <strong>{formatarValorMonetario(resumoUnidadeSelecionada.total_calculavel)}</strong></span>
                {resumoUnidadeSelecionada.saldo !== null ? <span>{resumoUnidadeSelecionada.saldo < 0 ? "Excedente" : "Saldo"}: <strong>{formatarValorMonetario(Math.abs(resumoUnidadeSelecionada.saldo))}</strong></span> : null}
              </div>
            </aside>
          ) : null}

          <Secao eyebrow="Dossier" titulo="Documentos do empreendimento">
            {!acessoDocumentos ? <EstadoSecao tipo="empty" mensagem="Não tem permissão para consultar os documentos deste empreendimento." /> : loadingDocumentos ? <EstadoSecao tipo="loading" /> : errorDocumentos ? <EstadoSecao tipo="error" mensagem={errorDocumentos} /> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
                {categoriasApresentacao.map((categoria) => {
                  const ficheiros = documentos?.[categoria] || [];
                  return <div key={categoria} style={{ minWidth: 0, padding: 18, border: `1px solid ${theme.colors.border}`, borderRadius: 14, background: theme.colors.surface, boxSizing: "border-box" }}><div style={{ fontWeight: 800 }}>{mapCategoriaEmpreendimentoLabel(categoria)}</div>{ficheiros.length === 0 ? <div style={{ color: theme.colors.muted, fontSize: 13, marginTop: 12 }}>Sem documentos nesta categoria.</div> : <div style={{ minWidth: 0, display: "grid", gap: 8, marginTop: 12 }}>{ficheiros.map((ficheiro, index) => ficheiro?.url ? <a key={ficheiro.id || `${ficheiro.nome}-${index}`} href={ficheiro.url} target="_blank" rel="noreferrer" download={ficheiro.nome || undefined} style={{ display: "block", minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", color: theme.colors.primary, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>↗ {ficheiro.nome || "Abrir documento"}</a> : <span key={ficheiro.id || index} style={{ minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", color: theme.colors.muted, fontSize: 13 }}>Documento sem URL disponível.</span>)}</div>}</div>;
                })}
              </div>
            )}
          </Secao>
        </>
      )}
    </main>
  );
}
