import CadastroImovel from "./CadastroImovel";
import FichaImovel from "./FichaImovel";
import { useEstoqueImoveis } from "./modules/imoveis";
import { useClientes } from "./modules/clientes";
import { useEmpreendimentos } from "./modules/empreendimentos/hooks/useEmpreendimentos";
import { useEmpreendimentoCondicoesPagamento } from "./modules/empreendimentos/hooks/useEmpreendimentoCondicoesPagamento";
import { useUnidades } from "./modules/empreendimentos/hooks/useUnidades";
import {
  calcularCondicoesPagamentoPorUnidade,
  formatarValorMonetario
} from "./modules/empreendimentos/services/unidadesService";
import Button from "./components/ui/Button";
import Input from "./components/ui/Input";
import Select from "./components/ui/Select";
import EmptyState from "./components/ui/EmptyState";
import Tooltip from "./components/ui/Tooltip";
import EmpreendimentoApresentacao from "./components/empreendimentos/EmpreendimentoApresentacao";
import { Fragment, useEffect, useState } from "react";

const PRIVATE_CLIENT_FIELDS = [
  "telefone_fixo",
  "telefone_movel",
  "email",
  "contacto_1",
  "telemovel_contacto_1",
  "email_contacto_1",
  "contacto_2",
  "telemovel_contacto_2",
  "email_contacto_2"
];

export default function EstoqueNaoPublicitado({ selectionRequest = null, defaultSection = "imoveis" }) {
  const [secaoAtual, setSecaoAtual] = useState(defaultSection);
  const [clienteDetalhe, setClienteDetalhe] = useState(null);
  const [empreendimentoDetalhe, setEmpreendimentoDetalhe] = useState(null);
  const [mostrarApresentacaoEmpreendimento, setMostrarApresentacaoEmpreendimento] = useState(false);

  const {
    busca,
    moduloAtual,
    form,
    imovelSelecionado,
    file,
    ficheiros,
    ficheiroSelecionado,
    uploading,
    progresso,
    isEditing,
    filtrados,
    setBusca,
    setModuloAtual,
    setField,
    setFile,
    setFicheiroSelecionado,
    setImovelSelecionado,
    abrirNovoCadastro,
    voltarParaLista,
    iniciarEdicaoSelecionado,
    cancelarNovo,
    handleTelefoneChange,
    salvarImovel,
    apagarFicheiro,
    excluirImovel,
    uploadFicheiro,
    downloadFicheiro,
    selecionarImovel
  } = useEstoqueImoveis({ selectionRequest });

  const clientes = useClientes();
  const {
    usuariosEmpresa,
    busca: buscaClientes,
    setBusca: setBuscaClientes,
    moduloAtual: moduloAtualClientes,
    form: formCliente,
    setField: setFieldCliente,
    clienteEdicao,
    submitting,
    loading,
    error,
    filtrados: clientesFiltrados,
    empreendimentosPorCliente,
    podeVer,
    podeCriar,
    podeEditar,
    podeEliminar,
    podeVerDadosPrivados,
    currentProfileId,
    abrirNovoCliente,
    voltarParaLista: voltarClientes,
    iniciarEdicaoCliente,
    salvarCliente,
    excluirCliente
  } = clientes;

  const empreendimentoState = useEmpreendimentos({ clienteId: clienteDetalhe?.id || null });
  const {
    empreendimentos,
    loading: loadingEmpreendimentos,
    submitting: submittingEmpreendimento,
    error: errorEmpreendimento,
    form: formEmpreendimento,
    setField: setFieldEmpreendimento,
    mostrarFormulario,
    setMostrarFormulario,
    empreendimentoEdicao,
    podeVer: podeVerEmpreendimentos,
    podeCriar: podeCriarEmpreendimento,
    podeEditar: podeEditarEmpreendimento,
    podeEliminar: podeEliminarEmpreendimento,
    distritoOptions,
    concelhoOptions,
    freguesiaOptions,
    abrirNovoEmpreendimento,
    iniciarEdicaoEmpreendimento,
    resetFormulario: resetFormularioEmpreendimento,
    salvarEmpreendimento,
    excluirEmpreendimento,
    documentosEmpreendimento,
    loadingDocumentosEmpreendimento,
    documentosError,
    documentAction,
    carregarDocumentosEmpreendimento,
    uploadDocumentoEmpreendimento,
    substituirDocumentoEmpreendimento,
    eliminarDocumentoEmpreendimento,
    EMPREENDIMENTO_DOCUMENT_CATEGORIES
  } = empreendimentoState;

  const condicoesPagamentoState = useEmpreendimentoCondicoesPagamento({ empreendimentoId: empreendimentoDetalhe?.id || null });
  const {
    condicoes,
    loading: loadingCondicoes,
    saving: savingCondicoes,
    error: errorCondicoes,
    podeEditar: podeEditarCondicoes,
    podeCriar: podeCriarCondicoes,
    podeEliminar: podeEliminarCondicoes,
    totalPercentual,
    nomesEtapasDuplicados,
    atualizarCondicao,
    adicionarEtapa,
    removerEtapa,
    salvarCondicoes
  } = condicoesPagamentoState;

  const unidadesState = useUnidades({ empreendimentoId: empreendimentoDetalhe?.id || null });
  const {
    unidades,
    loading: loadingUnidades,
    saving: savingUnidades,
    error: errorUnidades,
    form: formUnidade,
    setField: setFieldUnidade,
    unidadeEdicao,
    resetFormulario: resetFormularioUnidade,
    abrirNovaUnidade,
    iniciarEdicaoUnidade,
    duplicarUnidade,
    guardarUnidade,
    excluirUnidade,
    podeVer: podeVerUnidades,
    podeCriar: podeCriarUnidades,
    podeEditar: podeEditarUnidades,
    podeEliminar: podeEliminarUnidades,
    podeDuplicar: podeDuplicarUnidades,
    file: fileUnidade,
    setFile: setFileUnidade,
    uploading: uploadingUnidade,
    progresso: progressoUnidade,
    uploadPlanta,
    deletePlanta
  } = unidadesState;

  const [mostrarFormularioUnidade, setMostrarFormularioUnidade] = useState(false);
  const [unidadeCondicoesAbertaId, setUnidadeCondicoesAbertaId] = useState(null);

  useEffect(() => {
    setSecaoAtual(defaultSection);
  }, [defaultSection]);

  useEffect(() => {
    if (!clienteDetalhe) {
      setEmpreendimentoDetalhe(null);
      return;
    }

    setEmpreendimentoDetalhe(null);
  }, [clienteDetalhe]);

  useEffect(() => {
    if (!empreendimentoDetalhe?.id) {
      return;
    }

    carregarDocumentosEmpreendimento(empreendimentoDetalhe.id);
  }, [empreendimentoDetalhe?.id, carregarDocumentosEmpreendimento]);

  useEffect(() => {
    setUnidadeCondicoesAbertaId(null);
  }, [empreendimentoDetalhe?.id]);

  const {
    proprietario,
    telefone,
    telefoneErro,
    tipologia,
    zona,
    valorPretendido,
    observacoes,
    email,
    valorVenda,
    valorM2,
    areaBrutaPrivativa,
    areaUtil,
    numeroQuartos,
    casasBanho,
    estacionamento,
    precoCondominio,
    codigoPostal,
    morada,
    distrito,
    concelho,
    freguesia,
    cmi,
    cadernetaPredial,
    plantas,
    certificadoEnergetico,
    cartaoCidadao
  } = form;

  const privateFieldMask = (fieldName, value, contextClient = null) => {
    const isCreator = String(contextClient?.created_by || "") === String(currentProfileId || "");
    const showPrivate = Boolean(podeVerDadosPrivados || isCreator);

    if (showPrivate || !PRIVATE_CLIENT_FIELDS.includes(fieldName)) {
      return value || "";
    }

    return "🔒 Dados privados";
  };

  const renderRestrictedFieldLabel = (label, fieldName, contextClient = null) => {
    if (!PRIVATE_CLIENT_FIELDS.includes(fieldName)) {
      return label;
    }

    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span>{label}</span>
        <Tooltip
          maxWidth={500}
          tooltipStyle={{ whiteSpace: "normal" }}
          content={
            <span style={{ display: "inline-block", maxWidth: 480 }}>
              <strong>Dados restritos</strong>
              <br />
              Este dado é visível apenas ao utilizador responsável pelo cadastro e aos utilizadores autorizados.
            </span>
          }
        >
          <span aria-label="Dados restritos" style={{ cursor: "help", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
            🔒
          </span>
        </Tooltip>
      </span>
    );
  };

  const abrirDetalheCliente = (cliente) => {
    setClienteDetalhe(cliente);
    setEmpreendimentoDetalhe(null);
    setMostrarApresentacaoEmpreendimento(false);
    setMostrarFormulario(false);
  };

  const abrirCadastroEmpreendimento = (cliente) => {
    setClienteDetalhe(cliente);
    setEmpreendimentoDetalhe(null);
    setMostrarApresentacaoEmpreendimento(false);
    setMostrarFormulario(true);
  };

  const voltarParaListaClientes = () => {
    setClienteDetalhe(null);
    setEmpreendimentoDetalhe(null);
    setMostrarApresentacaoEmpreendimento(false);
    setMostrarFormulario(false);
    voltarClientes();
  };

  const renderBreadcrumbCliente = () => (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, color: "var(--os-color-muted)", fontSize: "0.9rem", marginBottom: 16 }}>
      <button type="button" onClick={() => setClienteDetalhe(null)} style={{ background: "transparent", border: "none", color: "var(--os-color-text)", cursor: "pointer", fontWeight: 600, padding: 0 }}>Empreendimentos</button>
      {clienteDetalhe ? (
        <>
          <span>›</span>
          <span style={{ color: "var(--os-color-text)", fontWeight: 600 }}>{clienteDetalhe?.nome_designacao || "Cliente"}</span>
        </>
      ) : null}
      {empreendimentoDetalhe ? (
        <>
          <span>›</span>
          <span style={{ color: "var(--os-color-text)", fontWeight: 600 }}>{empreendimentoDetalhe.nome || "Empreendimento"}</span>
        </>
      ) : null}
    </div>
  );

  const renderUnidades = () => {
    const unidadeCondicoesSelecionada = unidades.find((unidade) => unidade.id === unidadeCondicoesAbertaId) || null;
    const resumoCondicoesSelecionada = unidadeCondicoesSelecionada
      ? calcularCondicoesPagamentoPorUnidade({ precoVenda: unidadeCondicoesSelecionada.preco_venda, condicoes })
      : null;
    const estadoFinanceiroSelecionado = resumoCondicoesSelecionada
      ? obterEstadoFinanceiro(resumoCondicoesSelecionada)
      : null;
    const menuItemButton = {
      border: "none",
      borderRadius: 6,
      background: "transparent",
      color: "var(--os-color-text)",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 13,
      padding: "7px 8px",
      textAlign: "left",
      whiteSpace: "nowrap"
    };

    return (
    <div style={{ ...cardNovo, marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Unidades</h3>
          <small style={{ color: "var(--os-color-muted)" }}>{unidades.length} registo(s)</small>
        </div>
        {podeCriarUnidades ? (
          <Button onClick={() => { setMostrarFormularioUnidade(true); abrirNovaUnidade(); }}>+ Adicionar unidade</Button>
        ) : null}
      </div>

      {mostrarFormularioUnidade ? (
        <div style={{ display: "grid", gap: 12, padding: "12px 0", borderTop: "1px solid var(--os-color-border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
            <Input label="Fração" value={formUnidade.fracao || ""} onChange={(e) => setFieldUnidade("fracao", e.target.value)} />
            <Input label="Tipologia" value={formUnidade.tipologia || ""} onChange={(e) => setFieldUnidade("tipologia", e.target.value)} />
            <Input label="Preço de venda (€)" type="number" min="0" step="0.01" value={formUnidade.preco_venda ?? ""} onChange={(e) => setFieldUnidade("preco_venda", e.target.value)} />
            <Input label="Área Bruta Privativa (m²)" type="number" step="0.01" value={formUnidade.area_bruta_privativa ?? ""} onChange={(e) => setFieldUnidade("area_bruta_privativa", e.target.value)} />
            <Input label="Área Total (m²)" type="number" step="0.01" value={formUnidade.area_total ?? ""} onChange={(e) => setFieldUnidade("area_total", e.target.value)} />
            <Input label="Área Dependente (m²)" type="number" step="0.01" value={formUnidade.area_dependente ?? ""} onChange={(e) => setFieldUnidade("area_dependente", e.target.value)} />
            <Select label="Lugares de garagem" placeholder="Selecione" value={formUnidade.lugares_garagem ?? ""} onChange={(e) => setFieldUnidade("lugares_garagem", e.target.value)} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" }, { value: "6", label: "6" }]} />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={Boolean(formUnidade.varanda)} onChange={(e) => setFieldUnidade("varanda", e.target.checked)} /> Varanda</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={Boolean(formUnidade.terraco)} onChange={(e) => setFieldUnidade("terraco", e.target.checked)} /> Terraço</label>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setFileUnidade(e.target.files?.[0] || null)} />
            {fileUnidade ? <small>{fileUnidade.name}</small> : null}
          </div>

          {errorUnidades ? <div style={{ color: "var(--os-color-danger)", fontWeight: 600 }}>{errorUnidades}</div> : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button variant="primary" onClick={async () => { const saved = await guardarUnidade(); if (saved) setMostrarFormularioUnidade(false); }} loading={savingUnidades}>Guardar unidade</Button>
            <Button variant="light" onClick={() => { setMostrarFormularioUnidade(false); resetFormularioUnidade(); }}>Cancelar</Button>
          </div>
        </div>
      ) : null}

      {loadingUnidades ? <div style={{ padding: 20 }}>A carregar unidades…</div> : null}

      {!loadingUnidades && unidades.length === 0 && !mostrarFormularioUnidade ? (
        <EmptyState title="Sem unidades" description="Ainda não existem unidades associadas a este empreendimento." />
      ) : null}

      {!loadingUnidades && unidades.length > 0 ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
          <div style={{ flex: "1 1 560px", minWidth: 0 }}>
          <table style={{ ...table, tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ ...thCompact, width: "12%" }}>Fração</th>
                <th style={{ ...thCompact, width: "13%" }}>Tipologia</th>
                <th style={{ ...thCompact, width: "13%" }}>Área</th>
                <th style={{ ...thCompact, width: "15%" }}>Preço</th>
                <th style={{ ...thCompact, width: "23%" }}>Condições</th>
                <th style={{ ...thCompact, width: "12%" }}>Planta</th>
                <th style={{ ...thCompact, width: "15%", whiteSpace: "nowrap" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {unidades.map((unidade) => {
                const planta = unidade?.planta || null;
                const resumoCondicoes = calcularCondicoesPagamentoPorUnidade({ precoVenda: unidade.preco_venda, condicoes });
                const condicoesAbertas = unidadeCondicoesAbertaId === unidade.id;
                const estadoFinanceiro = obterEstadoFinanceiro(resumoCondicoes);

                return (
                  <Fragment key={unidade.id}>
                  <tr key={unidade.id} style={{ ...tr, backgroundColor: condicoesAbertas ? "rgba(37, 99, 235, 0.06)" : undefined }}>
                    <td data-testid={`unidade-identidade-${unidade.id}`} style={{ ...tdCompact, borderLeft: `4px solid ${getUnidadeAccentColor(unidade.id)}` }}>
                      <strong>{unidade.fracao || "—"}</strong>
                    </td>
                    <td style={tdCompact}>{unidade.tipologia || "—"}</td>
                    <td style={tdCompact}>{unidade.area_bruta_privativa != null ? `${unidade.area_bruta_privativa} m²` : "—"}</td>
                    <td style={tdCompact}>{formatarValorMonetario(unidade.preco_venda)}</td>
                    <td style={tdCompact}>
                      <div style={{ display: "grid", gap: 4 }}>
                          <button
                            type="button"
                            aria-label={`Condições de pagamento da fração ${unidade.fracao || "selecionada"}`}
                            onClick={() => setUnidadeCondicoesAbertaId(condicoesAbertas ? null : unidade.id)}
                            style={{ border: 0, padding: 0, background: "transparent", color: "var(--os-color-primary)", cursor: "pointer", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" }}
                          >Condições de pagamento</button>
                        <span>{resumoCondicoes.etapas.length} etapa(s)</span>
                        <span style={getEstadoBadgeStyle(estadoFinanceiro.tipo)}>{estadoFinanceiro.label}</span>
                        {resumoCondicoes.totais_parciais ? <small style={{ color: "var(--os-color-muted)" }}>Total parcial</small> : null}
                      </div>
                    </td>
                    <td style={tdCompact}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                        {planta ? (
                          <>
                            <a href={planta.url} target="_blank" rel="noreferrer" style={{ color: "var(--os-color-primary)", textDecoration: "none", fontWeight: 600 }}>
                              Planta{planta.nome ? `: ${planta.nome}` : ""}
                            </a>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <label style={{ fontSize: "0.75rem", color: "var(--os-color-primary)", cursor: "pointer", fontWeight: 600 }}>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  style={{ display: "none" }}
                                  onChange={async (e) => {
                                    const selected = e.target.files?.[0];
                                    if (!selected) return;
                                    setFileUnidade(selected);
                                    await uploadPlanta(unidade.id);
                                    e.target.value = "";
                                  }}
                                  disabled={!podeEditarUnidades}
                                />
                                Substituir
                              </label>
                            </div>
                          </>
                        ) : (
                          <>
                          <span style={{ fontSize: "0.75rem", color: "var(--os-color-muted)" }}>Sem planta</span>
                          <label style={{ fontSize: "0.75rem", color: "var(--os-color-primary)", cursor: "pointer", fontWeight: 600 }}>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              style={{ display: "none" }}
                              onChange={async (e) => {
                                const selected = e.target.files?.[0];
                                if (!selected) return;
                                setFileUnidade(selected);
                                await uploadPlanta(unidade.id, selected);
                                e.target.value = "";
                              }}
                              disabled={!podeEditarUnidades}
                            />
                            + Adicionar planta
                          </label>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ ...tdCompact, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          style={{ minHeight: 34, padding: "6px 9px", whiteSpace: "nowrap" }}
                          onClick={() => { setMostrarFormularioUnidade(true); iniciarEdicaoUnidade(unidade); }}
                          disabled={!podeEditarUnidades}
                        >Editar</Button>
                        <details style={{ position: "relative" }}>
                          <summary
                            aria-label="Mais ações"
                            title="Mais ações"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, padding: 0, border: "1px solid var(--os-color-border)", borderRadius: 8, background: "var(--os-color-surface)", color: "var(--os-color-text)", cursor: "pointer", fontSize: 20, lineHeight: 1, listStyle: "none", whiteSpace: "nowrap" }}
                          >⋯</summary>
                          <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20, display: "grid", gap: 4, minWidth: 170, padding: 6, border: "1px solid var(--os-color-border)", borderRadius: 10, background: "var(--os-color-surface)", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
                            <button
                              type="button"
                              role="menuitem"
                              aria-controls={`condicoes-unidade-${unidade.id}`}
                              onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setUnidadeCondicoesAbertaId(condicoesAbertas ? null : unidade.id); }}
                              style={menuItemButton}
                            >{condicoesAbertas ? "Fechar condições" : "Condições"}</button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setMostrarFormularioUnidade(true); duplicarUnidade(unidade); }}
                              disabled={!podeDuplicarUnidades}
                              style={menuItemButton}
                            >Duplicar</button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); excluirUnidade(unidade); }}
                              disabled={!podeEliminarUnidades}
                              style={{ ...menuItemButton, color: "var(--os-color-danger)" }}
                            >Eliminar</button>
                            {planta ? (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); deletePlanta(planta); }}
                                disabled={!podeEliminarUnidades}
                                style={{ ...menuItemButton, color: "var(--os-color-danger)" }}
                              >Eliminar planta</button>
                            ) : null}
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
          {unidadeCondicoesSelecionada && resumoCondicoesSelecionada ? (
            <aside id={`condicoes-unidade-${unidadeCondicoesSelecionada.id}`} style={{ flex: "1 1 320px", minWidth: 0, maxWidth: 380, border: "1px solid var(--os-color-border)", borderRadius: 12, padding: 10, background: "var(--os-color-surface-soft)", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 8px" }}>
                  <strong>Fração {unidadeCondicoesSelecionada.fracao || "—"}</strong>
                  <span style={{ fontSize: 13 }}>Preço: <strong>{formatarValorMonetario(resumoCondicoesSelecionada.preco_venda)}</strong></span>
                  <span style={{ fontSize: 12, color: "var(--os-color-muted)" }}>Condições herdadas do empreendimento</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setUnidadeCondicoesAbertaId(null)}>Fechar</Button>
              </div>
              <div data-testid="unidade-detalhes" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 6, marginBottom: 8, fontSize: 12 }}>
                <span>Tipologia: <strong>{unidadeCondicoesSelecionada.tipologia || "—"}</strong></span>
                <span>Área: <strong>{unidadeCondicoesSelecionada.area_bruta_privativa != null ? `${unidadeCondicoesSelecionada.area_bruta_privativa} m²` : "—"}</strong></span>
                {unidadeCondicoesSelecionada.planta?.url ? (
                  <a href={unidadeCondicoesSelecionada.planta.url} target="_blank" rel="noreferrer" style={{ color: "var(--os-color-primary)", fontWeight: 600, textDecoration: "none" }}>
                    Abrir planta
                  </a>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13, marginBottom: 8 }}>
                <span>Estado:</span>
                <span style={getEstadoBadgeStyle(estadoFinanceiroSelecionado.tipo)}>{estadoFinanceiroSelecionado.label}</span>
              </div>
              {resumoCondicoesSelecionada.tem_tipo_invalido || resumoCondicoesSelecionada.tem_valor_invalido ? (
                <small style={{ display: "block", color: "var(--os-color-danger)", fontWeight: 600, marginBottom: 8 }}>Existem condições inválidas. O plano não está validado.</small>
              ) : null}
              {resumoCondicoesSelecionada.etapas.length === 0 ? (
                <small style={{ color: "var(--os-color-muted)" }}>Sem condições de pagamento configuradas.</small>
              ) : (
                <table style={{ ...table, tableLayout: "fixed", fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th style={panelTh}>Etapa</th>
                      <th style={panelTh}>Condição</th>
                      <th style={{ ...panelTh, textAlign: "right" }}>Montante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoCondicoesSelecionada.etapas.map((etapa) => (
                      <tr key={`${unidadeCondicoesSelecionada.id}-${etapa.nome_etapa}-${etapa.ordem}`}>
                        <td style={panelTd}>{etapa.nome_etapa}</td>
                        <td style={panelTd}>{!etapa.tipo_suportado || !etapa.valor_valido ? "Condição inválida" : etapa.tipo_valor === "percentual" ? `${etapa.valor}%` : formatarValorMonetario(etapa.valor)}</td>
                        <td style={{ ...panelTd, textAlign: "right", whiteSpace: "nowrap" }}>{etapa.montante === null ? (!etapa.tipo_suportado || !etapa.valor_valido ? "Não calculável" : "Preço necessário") : formatarValorMonetario(etapa.montante)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ display: "grid", gap: 3, fontSize: 13, marginTop: 8 }}>
                <span>Total{resumoCondicoesSelecionada.totais_parciais ? " parcial" : ""}: <strong>{formatarValorMonetario(resumoCondicoesSelecionada.total_calculavel)}</strong></span>
                {resumoCondicoesSelecionada.saldo !== null ? <span>{resumoCondicoesSelecionada.saldo < 0 ? "Excedente" : "Saldo"}: <strong>{formatarValorMonetario(Math.abs(resumoCondicoesSelecionada.saldo))}</strong></span> : null}
              </div>
              {resumoCondicoesSelecionada.tem_percentual_sem_preco ? <small style={{ display: "block", color: "var(--os-color-muted)", marginTop: 8 }}>Defina o preço de venda da fração para calcular os percentuais.</small> : null}
            </aside>
          ) : null}
        </div>
      ) : null}
    </div>
    );
  };

  const renderDocumentosEmpreendimento = () => {
    const categorias = EMPREENDIMENTO_DOCUMENT_CATEGORIES || [];

    return (
      <div style={{ ...cardNovo, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Documentos</h3>
            <small style={{ color: "var(--os-color-muted)" }}>{categorias.length} categorias</small>
          </div>
        </div>

        {loadingDocumentosEmpreendimento ? <div style={{ padding: 20 }}>A carregar documentos…</div> : null}

        {!loadingDocumentosEmpreendimento && documentosError ? (
          <div style={{ color: "var(--os-color-danger)", fontWeight: 600, marginBottom: 12 }}>{documentosError}</div>
        ) : null}

        {!loadingDocumentosEmpreendimento && categorias.length === 0 ? (
          <EmptyState title="Sem categorias" description="Não existem categorias de documentos configuradas." />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {categorias.map((categoria) => {
              const docs = documentosEmpreendimento?.[categoria] || [];
              const documento = docs[0] || null;
              const isBusy = documentAction?.category === categoria && (documentAction?.action === "upload" || documentAction?.action === "replace" || documentAction?.action === "delete");
              const label = categoria === "brochura" ? "Brochura" : categoria === "planta" ? "Plantas" : categoria === "mapa_acabamentos" ? "Mapa de acabamentos" : categoria === "mapa_unidades" ? "Mapa das unidades" : categoria === "tabela_precos" ? "Tabela de preços" : "Documentos adicionais";

              return (
                <div key={categoria} style={{ border: "1px solid var(--os-color-border)", borderRadius: 12, padding: 12, background: "var(--os-color-surface-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                    <strong>{label}</strong>
                    {podeEditarEmpreendimento ? (
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--os-color-primary)", cursor: isBusy ? "not-allowed" : "pointer", fontWeight: 600, opacity: isBusy ? 0.7 : 1 }}>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          style={{ display: "none" }}
                          onChange={async (event) => {
                            const selected = event.target.files?.[0];
                            if (!selected) return;

                            if (documento) {
                              await substituirDocumentoEmpreendimento({ empreendimentoId: empreendimentoDetalhe?.id, categoria, ficheiro: documento, file: selected });
                            } else {
                              await uploadDocumentoEmpreendimento({ empreendimentoId: empreendimentoDetalhe?.id, categoria, file: selected });
                            }

                            event.target.value = "";
                          }}
                          disabled={isBusy}
                        />
                        {documento ? "Substituir" : "+ Adicionar"}
                      </label>
                    ) : null}
                  </div>

                  {documento ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <a href={documento.url} target="_blank" rel="noreferrer" style={{ color: "var(--os-color-primary)", textDecoration: "none", fontWeight: 600 }}>
                        {documento.nome || "Abrir ficheiro"}
                      </a>
                      <small style={{ color: "var(--os-color-muted)" }}>
                        {documento.tipo || "ficheiro"} • {new Date(documento.created_at || Date.now()).toLocaleDateString("pt-PT")}
                      </small>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Button size="sm" variant="ghost" onClick={() => window.open(documento.url, "_blank", "noopener,noreferrer")} disabled={!documento?.url}>Abrir</Button>
                        <Button size="sm" variant="light" onClick={async () => {
                          const selectedInput = document.createElement("input");
                          selectedInput.type = "file";
                          selectedInput.accept = ".pdf,image/*";
                          selectedInput.onchange = async (changeEvent) => {
                            const file = changeEvent.target.files?.[0];
                            if (!file) return;
                            await substituirDocumentoEmpreendimento({ empreendimentoId: empreendimentoDetalhe?.id, categoria, ficheiro: documento, file });
                          };
                          selectedInput.click();
                        }} disabled={!podeEditarEmpreendimento || isBusy}>Substituir</Button>
                        <Button size="sm" variant="danger" onClick={() => eliminarDocumentoEmpreendimento({ empreendimentoId: empreendimentoDetalhe?.id, ficheiro: documento, categoria })} disabled={!podeEditarEmpreendimento || isBusy}>Eliminar</Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "var(--os-color-muted)" }}>Ainda não existe nenhum documento nesta categoria.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCondicoesPagamento = () => (
    <div style={{ ...cardNovo, marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Condições de pagamento</h3>
          <small style={{ color: "var(--os-color-muted)" }}>Total configurado: {totalPercentual.toFixed(2)}%</small>
        </div>
        {podeEditarCondicoes || podeCriarCondicoes ? (
          <Button onClick={adicionarEtapa}>+ Adicionar etapa</Button>
        ) : null}
      </div>

      {loadingCondicoes ? <div style={{ padding: 20 }}>A carregar condições…</div> : null}

      {!loadingCondicoes && condicoes.length === 0 ? (
        <EmptyState title="Sem condições" description="Ainda não existem condições de pagamento configuradas para este empreendimento." />
      ) : (
        <div style={{ display: "grid" }}>
          {condicoes.map((condicao, index) => {
            const canManageStep = (podeEditarCondicoes || podeCriarCondicoes) && !condicao.isPermanent;
            const valorInputLabel = condicao.tipo_valor === "percentual" ? "%" : "€";

            return (
              <div key={condicao.id || condicao.localId || `condicao-${index}`} data-testid={`condicao-pagamento-${condicao.id || condicao.localId || index}`} style={condicaoRow}>
                <Input
                  size="sm"
                  label="Nome"
                  value={condicao.nome_etapa || ""}
                  onChange={(e) => atualizarCondicao(index, "nome_etapa", e.target.value)}
                  disabled={condicao.isPermanent || (!podeEditarCondicoes && !podeCriarCondicoes)}
                  style={{ minWidth: 0 }}
                />
                <Select
                  size="sm"
                  label="Tipo de valor"
                  placeholder="Selecione"
                  value={condicao.tipo_valor || "fixo"}
                  onChange={(e) => atualizarCondicao(index, "tipo_valor", e.target.value)}
                  options={[{ value: "fixo", label: "Valor fixo" }, { value: "percentual", label: "Percentual" }]}
                  disabled={!podeEditarCondicoes && !podeCriarCondicoes}
                  style={{ minWidth: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Valor</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", right: 10, top: 9, color: "var(--os-color-muted)", fontSize: 13 }}>{valorInputLabel}</span>
                    <input
                      aria-label="Valor"
                      type="number"
                      step="0.01"
                      min="0"
                      max={condicao.tipo_valor === "percentual" ? "100" : undefined}
                      value={condicao.valor ?? ""}
                      onChange={(e) => atualizarCondicao(index, "valor", e.target.value)}
                      disabled={!podeEditarCondicoes && !podeCriarCondicoes}
                      style={{ width: "100%", minHeight: 36, padding: "8px 30px 8px 8px", borderRadius: 8, border: "1px solid var(--os-color-border)", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <Select
                  size="sm"
                  label="Valor negociável"
                  placeholder="Selecione"
                  value={condicao.negociavel ? "sim" : "nao"}
                  onChange={(e) => atualizarCondicao(index, "negociavel", e.target.value === "sim")}
                  options={[{ value: "nao", label: "Não" }, { value: "sim", label: "Sim" }]}
                  disabled={!podeEditarCondicoes && !podeCriarCondicoes}
                  style={{ minWidth: 0 }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", minHeight: 36 }}>
                  {canManageStep ? (
                    <Button variant="danger" size="sm" onClick={() => removerEtapa(index)}>Eliminar</Button>
                  ) : null}
                </div>
                {condicao.negociavel ? (
                  <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                    <Input
                      size="sm"
                      label="Condição de negociação"
                      value={condicao.condicao_negociacao || ""}
                      onChange={(e) => atualizarCondicao(index, "condicao_negociacao", e.target.value)}
                      disabled={!podeEditarCondicoes && !podeCriarCondicoes}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {errorCondicoes ? <div style={{ color: "var(--os-color-danger)", fontWeight: 600, marginTop: 12 }}>{errorCondicoes}</div> : null}
      {nomesEtapasDuplicados.length > 0 ? (
        <div role="alert" style={{ color: "var(--os-color-danger)", fontWeight: 600, marginTop: 12 }}>
          Existem etapas duplicadas ({nomesEtapasDuplicados.join(", ")}). Remova ou renomeie as entradas antes de guardar.
        </div>
      ) : null}

      {(podeEditarCondicoes || podeCriarCondicoes) ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <Button variant="primary" onClick={salvarCondicoes} loading={savingCondicoes}>Guardar condições</Button>
        </div>
      ) : null}
    </div>
  );

  const renderEmpreendimentoForm = () => (
    <div style={cardNovo}>
      <div style={barraSuperior}>
        <button style={btnVoltar} onClick={() => { setMostrarFormulario(false); setEmpreendimentoDetalhe(null); resetFormularioEmpreendimento(); }}>
          ← Voltar para a lista
        </button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Nome" value={formEmpreendimento.nome || ""} onChange={(e) => setFieldEmpreendimento("nome", e.target.value)} />
          <Input label="Percentual de comissão (%)" type="number" step="0.01" value={formEmpreendimento.percentual_comissao ?? ""} onChange={(e) => setFieldEmpreendimento("percentual_comissao", e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Select label="Distrito" placeholder="Selecione" value={formEmpreendimento.distrito || ""} onChange={(e) => setFieldEmpreendimento("distrito", e.target.value)} options={(distritoOptions || []).map((distrito) => ({ value: distrito, label: distrito }))} />
          <Select label="Concelho" placeholder="Selecione" value={formEmpreendimento.concelho || ""} onChange={(e) => setFieldEmpreendimento("concelho", e.target.value)} options={(concelhoOptions || []).map((concelho) => ({ value: concelho, label: concelho }))} disabled={!formEmpreendimento.distrito} />
          <Select label="Freguesia" placeholder="Selecione" value={formEmpreendimento.freguesia || ""} onChange={(e) => setFieldEmpreendimento("freguesia", e.target.value)} options={(freguesiaOptions || []).map((freguesia) => ({ value: freguesia, label: freguesia }))} disabled={!formEmpreendimento.concelho} />
        </div>

        <Input label="Morada" value={formEmpreendimento.morada || ""} onChange={(e) => setFieldEmpreendimento("morada", e.target.value)} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select label="IVA incluído" placeholder="Selecione" value={String(formEmpreendimento.iva_incluido ?? "")} onChange={(e) => setFieldEmpreendimento("iva_incluido", e.target.value)} options={[{ value: "true", label: "Incluído" }, { value: "false", label: "Não incluído" }]} />
          <Input label="Início das obras" type="date" value={formEmpreendimento.inicio_obras || ""} onChange={(e) => setFieldEmpreendimento("inicio_obras", e.target.value)} />
        </div>

        <Input label="Previsão de entrega" type="date" value={formEmpreendimento.previsao_entrega || ""} onChange={(e) => setFieldEmpreendimento("previsao_entrega", e.target.value)} />

        {errorEmpreendimento ? <div style={{ color: "var(--os-color-danger)", fontWeight: 600 }}>{errorEmpreendimento}</div> : null}

        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="primary" onClick={salvarEmpreendimento} loading={submittingEmpreendimento}>
            {empreendimentoEdicao ? "Guardar alterações" : "Guardar empreendimento"}
          </Button>
          <Button variant="light" onClick={() => { setMostrarFormulario(false); setEmpreendimentoDetalhe(null); resetFormularioEmpreendimento(); }}>Cancelar</Button>
        </div>
      </div>
    </div>
  );

  const renderEmpreendimentosTable = () => (
    <div style={cardNovo}>
      <div style={barraSuperior}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0 }}>Empreendimentos</h3>
        </div>
        {podeCriarEmpreendimento ? (
          <button style={btnNovo} onClick={async () => { setEmpreendimentoDetalhe(null); await abrirNovoEmpreendimento(); }}>+ Novo Empreendimento</button>
        ) : null}
      </div>

      {loadingEmpreendimentos ? <div style={{ padding: 20 }}>A carregar empreendimentos…</div> : null}

      {!loadingEmpreendimentos && empreendimentos.length === 0 ? (
        <div style={{ padding: "16px" }}>
          <EmptyState title="Sem empreendimentos" description="Ainda não existem empreendimentos associados a este cliente." action={podeCriarEmpreendimento ? <Button onClick={abrirNovoEmpreendimento}>+ Novo Empreendimento</Button> : null} />
        </div>
      ) : (
        <div style={tableWrapper}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Nome</th>
                <th style={th}>Localização</th>
                <th style={th}>Comissão</th>
                <th style={th}>Início das obras</th>
                <th style={th}>Previsão de entrega</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {empreendimentos.map((empreendimento) => (
                <tr key={empreendimento.id} style={{ ...tr, cursor: "pointer" }} onClick={() => { setEmpreendimentoDetalhe(empreendimento); setMostrarApresentacaoEmpreendimento(false); setMostrarFormulario(false); }}>
                  <td style={tdNome}>{empreendimento.nome || "—"}</td>
                  <td style={td}>{[empreendimento.distrito, empreendimento.concelho, empreendimento.freguesia].filter(Boolean).join(" / ") || "—"}</td>
                  <td style={td}>{empreendimento.percentual_comissao != null ? `${empreendimento.percentual_comissao}%` : "—"}</td>
                  <td style={td}>{empreendimento.inicio_obras ? new Date(empreendimento.inicio_obras).toLocaleDateString("pt-PT") : "—"}</td>
                  <td style={td}>{empreendimento.previsao_entrega ? new Date(empreendimento.previsao_entrega).toLocaleDateString("pt-PT") : "—"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button size="sm" variant="light" onClick={(event) => { event.stopPropagation(); abrirApresentacaoEmpreendimento(empreendimento); }} disabled={!podeVerEmpreendimentos}>Ver apresentação</Button>
                      <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); abrirEdicaoEmpreendimento(empreendimento); }} disabled={!podeEditarEmpreendimento}>Editar</Button>
                      <Button size="sm" variant="danger" onClick={(event) => { event.stopPropagation(); excluirEmpreendimento(empreendimento); }} disabled={!podeEliminarEmpreendimento}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderEmpreendimentoDetalhe = () => (
    <div>
      {renderBreadcrumbCliente()}

      <div style={cardDetalhe}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>{empreendimentoDetalhe?.nome || "Empreendimento"}</h3>
            <small style={{ color: "var(--os-color-muted)" }}>{[empreendimentoDetalhe?.distrito, empreendimentoDetalhe?.concelho, empreendimentoDetalhe?.freguesia].filter(Boolean).join(" / ") || "Sem localização"}</small>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="light" onClick={() => { setMostrarApresentacaoEmpreendimento(false); setEmpreendimentoDetalhe(null); }}>Voltar para empreendimentos</Button>
            {!mostrarFormulario && podeEditarEmpreendimento ? <Button onClick={() => abrirEdicaoEmpreendimento(empreendimentoDetalhe)}>Editar empreendimento</Button> : null}
          </div>
        </div>

        {mostrarFormulario ? renderEmpreendimentoForm() : (
          <>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: 0, marginBottom: 12 }}>Dados do Empreendimento</h4>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div style={{ background: "var(--os-color-surface-soft)", padding: 12, borderRadius: 8 }}><strong>Comissão</strong><div>{empreendimentoDetalhe?.percentual_comissao != null ? `${empreendimentoDetalhe.percentual_comissao}%` : "—"}</div></div>
              <div style={{ background: "var(--os-color-surface-soft)", padding: 12, borderRadius: 8 }}><strong>Início das obras</strong><div>{empreendimentoDetalhe?.inicio_obras ? new Date(empreendimentoDetalhe.inicio_obras).toLocaleDateString("pt-PT") : "—"}</div></div>
              <div style={{ background: "var(--os-color-surface-soft)", padding: 12, borderRadius: 8 }}><strong>Previsão de entrega</strong><div>{empreendimentoDetalhe?.previsao_entrega ? new Date(empreendimentoDetalhe.previsao_entrega).toLocaleDateString("pt-PT") : "—"}</div></div>
            </div>
          </>
        )}
      </div>

      {renderCondicoesPagamento()}
      {renderUnidades()}
      {renderDocumentosEmpreendimento()}
    </div>
  );

  const abrirApresentacaoEmpreendimento = (empreendimento) => {
    setEmpreendimentoDetalhe(empreendimento);
    setMostrarFormulario(false);
    setMostrarApresentacaoEmpreendimento(true);
  };

  const abrirEdicaoEmpreendimento = (empreendimento) => {
    setEmpreendimentoDetalhe(empreendimento);
    setMostrarApresentacaoEmpreendimento(false);
    iniciarEdicaoEmpreendimento(empreendimento);
  };

  const renderEmpreendimentoApresentacao = () => (
    <EmpreendimentoApresentacao
      empreendimento={empreendimentoDetalhe}
      cliente={clienteDetalhe}
      condicoes={condicoes}
      unidades={unidades}
      documentos={documentosEmpreendimento}
      categorias={EMPREENDIMENTO_DOCUMENT_CATEGORIES}
      loadingCondicoes={loadingCondicoes}
      loadingUnidades={loadingUnidades}
      loadingDocumentos={loadingDocumentosEmpreendimento}
      errorCondicoes={errorCondicoes}
      errorUnidades={errorUnidades}
      errorDocumentos={documentosError}
      podeConsultarDocumentos={podeVerEmpreendimentos}
      onBack={() => {
        setMostrarApresentacaoEmpreendimento(false);
        setEmpreendimentoDetalhe(null);
      }}
    />
  );

  const renderClienteDetalhe = () => (
    <div>
      {renderBreadcrumbCliente()}

      <div style={cardDetalhe}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>{clienteDetalhe?.nome_designacao || "Cliente"}</h3>
            <small style={{ color: "var(--os-color-muted)" }}>{clienteDetalhe?.tipo_cliente || "Cliente"}</small>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="light" onClick={voltarParaListaClientes}>Voltar para clientes</Button>
            {podeEditar ? <Button onClick={() => iniciarEdicaoCliente(clienteDetalhe)}>Editar cliente</Button> : null}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div style={{ background: "var(--os-color-surface-soft)", padding: 12, borderRadius: 8 }}><strong>NIPC</strong><div>{clienteDetalhe?.nipc || "—"}</div></div>
          <div style={{ background: "var(--os-color-surface-soft)", padding: 12, borderRadius: 8 }}><strong>AMI</strong><div>{clienteDetalhe?.ami || "—"}</div></div>
          <div style={{ background: "var(--os-color-surface-soft)", padding: 12, borderRadius: 8 }}><strong>Responsável</strong><div>{usuariosEmpresa.find((usuario) => String(usuario.id) === String(clienteDetalhe?.responsavel_angariacao)) ? `${usuariosEmpresa.find((usuario) => String(usuario.id) === String(clienteDetalhe?.responsavel_angariacao)).nome || ""} ${usuariosEmpresa.find((usuario) => String(usuario.id) === String(clienteDetalhe?.responsavel_angariacao)).apelido || ""}`.trim() : "—"}</div></div>
        </div>
      </div>

      {!podeVerEmpreendimentos ? (
        <EmptyState title="Sem acesso" description="Não tem permissão para consultar empreendimentos." />
      ) : (
        empreendimentoDetalhe ? (mostrarApresentacaoEmpreendimento ? renderEmpreendimentoApresentacao() : renderEmpreendimentoDetalhe()) : mostrarFormulario ? renderEmpreendimentoForm() : renderEmpreendimentosTable()
      )}
    </div>
  );

  const renderClienteForm = () => (
    <div style={cardNovo}>
      <div style={barraSuperior}>
        <button style={btnVoltar} onClick={voltarClientes}>
          ← Voltar para a lista
        </button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Select
            label="Tipo de cliente"
            placeholder="Selecione"
            value={formCliente.tipo_cliente || ""}
            onChange={(e) => setFieldCliente("tipo_cliente", e.target.value)}
            options={[
              { value: "Construtor", label: "Construtor" },
              { value: "Promotor", label: "Promotor" },
              { value: "Imobiliaria", label: "Imobiliária" }
            ]}
          />
          <Input label="Nome / Designação" value={formCliente.nome_designacao || ""} onChange={(e) => setFieldCliente("nome_designacao", e.target.value)} />
          <Input label="NIPC" value={formCliente.nipc || ""} onChange={(e) => setFieldCliente("nipc", e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="AMI" value={formCliente.ami || ""} onChange={(e) => setFieldCliente("ami", e.target.value)} />
          <Select
            label="Responsável pela angariação"
            placeholder="Selecione"
            value={formCliente.responsavel_angariacao || ""}
            onChange={(e) => setFieldCliente("responsavel_angariacao", e.target.value)}
            options={(usuariosEmpresa || []).map((usuario) => ({
              value: usuario.id,
              label: `${usuario.nome || ""} ${usuario.apelido || ""}`.trim() || usuario.email || "Utilizador"
            }))}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Telefone responsável" value={formCliente.telefone_responsavel || ""} onChange={(e) => setFieldCliente("telefone_responsavel", e.target.value)} />
          <Input label="Email responsável" value={formCliente.email_responsavel || ""} onChange={(e) => setFieldCliente("email_responsavel", e.target.value)} />
        </div>

        <div style={{ border: "1px solid var(--os-color-border)", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
          <strong>Contactos principais</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label={renderRestrictedFieldLabel("Telefone fixo", "telefone_fixo", clienteEdicao)} value={privateFieldMask("telefone_fixo", formCliente.telefone_fixo, clienteEdicao)} onChange={(e) => setFieldCliente("telefone_fixo", e.target.value)} readOnly={!podeVerDadosPrivados && !clienteEdicao?.created_by} />
            <Input label={renderRestrictedFieldLabel("Telefone móvel", "telefone_movel", clienteEdicao)} value={privateFieldMask("telefone_movel", formCliente.telefone_movel, clienteEdicao)} onChange={(e) => setFieldCliente("telefone_movel", e.target.value)} readOnly={!podeVerDadosPrivados && !clienteEdicao?.created_by} />
            <Input label={renderRestrictedFieldLabel("Email", "email", clienteEdicao)} value={privateFieldMask("email", formCliente.email, clienteEdicao)} onChange={(e) => setFieldCliente("email", e.target.value)} readOnly={!podeVerDadosPrivados && !clienteEdicao?.created_by} />
          </div>
        </div>

        <div style={{ border: "1px solid var(--os-color-border)", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
          <strong>Morada</strong>
          <Input label="Morada" value={formCliente.morada || ""} onChange={(e) => setFieldCliente("morada", e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Número de polícia" value={formCliente.numero_policia || ""} onChange={(e) => setFieldCliente("numero_policia", e.target.value)} />
            <Input label="Complemento" value={formCliente.complemento || ""} onChange={(e) => setFieldCliente("complemento", e.target.value)} />
          </div>
        </div>

        <div style={{ border: "1px solid var(--os-color-border)", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
          <strong>Contacto 1</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Input label={renderRestrictedFieldLabel("Nome", "contacto_1", clienteEdicao)} value={privateFieldMask("contacto_1", formCliente.contacto_1, clienteEdicao)} onChange={(e) => setFieldCliente("contacto_1", e.target.value)} readOnly={!podeVerDadosPrivados && !clienteEdicao?.created_by} />
            <Input label={renderRestrictedFieldLabel("Telemóvel", "telemovel_contacto_1", clienteEdicao)} value={privateFieldMask("telemovel_contacto_1", formCliente.telemovel_contacto_1, clienteEdicao)} onChange={(e) => setFieldCliente("telemovel_contacto_1", e.target.value)} readOnly={!podeVerDadosPrivados && !clienteEdicao?.created_by} />
            <Input label={renderRestrictedFieldLabel("Email", "email_contacto_1", clienteEdicao)} value={privateFieldMask("email_contacto_1", formCliente.email_contacto_1, clienteEdicao)} onChange={(e) => setFieldCliente("email_contacto_1", e.target.value)} readOnly={!podeVerDadosPrivados && !clienteEdicao?.created_by} />
          </div>
        </div>

        <div style={{ border: "1px solid var(--os-color-border)", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
          <strong>Contacto 2</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Input label={renderRestrictedFieldLabel("Nome", "contacto_2", clienteEdicao)} value={privateFieldMask("contacto_2", formCliente.contacto_2, clienteEdicao)} onChange={(e) => setFieldCliente("contacto_2", e.target.value)} readOnly={!podeVerDadosPrivados && !clienteEdicao?.created_by} />
            <Input label={renderRestrictedFieldLabel("Telemóvel", "telemovel_contacto_2", clienteEdicao)} value={privateFieldMask("telemovel_contacto_2", formCliente.telemovel_contacto_2, clienteEdicao)} onChange={(e) => setFieldCliente("telemovel_contacto_2", e.target.value)} readOnly={!podeVerDadosPrivados && !clienteEdicao?.created_by} />
            <Input label={renderRestrictedFieldLabel("Email", "email_contacto_2", clienteEdicao)} value={privateFieldMask("email_contacto_2", formCliente.email_contacto_2, clienteEdicao)} onChange={(e) => setFieldCliente("email_contacto_2", e.target.value)} readOnly={!podeVerDadosPrivados && !clienteEdicao?.created_by} />
          </div>
        </div>

        {error ? <div style={{ color: "var(--os-color-danger)", fontWeight: 600 }}>{error}</div> : null}

        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="primary" onClick={salvarCliente} loading={submitting}>
            {clienteEdicao ? "Guardar alterações" : "Guardar cliente"}
          </Button>
          <Button variant="light" onClick={voltarClientes}>Cancelar</Button>
        </div>
      </div>
    </div>
  );

  const renderClientesTable = () => (
    <div>
      <div style={barraSuperior}>
        <input
          style={input}
          placeholder="Pesquisar cliente..."
          value={buscaClientes}
          onChange={(e) => setBuscaClientes(e.target.value)}
        />
      </div>

      {loading ? <div style={{ padding: 20 }}>A carregar clientes…</div> : null}

      {!loading && clientesFiltrados.length === 0 ? (
        <div style={{ padding: "16px" }}>
          <EmptyState title="Sem clientes" description="Ainda não existem clientes para a empresa atual." action={podeCriar ? <Button onClick={abrirNovoCliente}>+ Novo Cliente</Button> : null} />
        </div>
      ) : (
        <div style={tableWrapper}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Cliente</th>
                <th style={th}>Tipo</th>
                <th style={th}>NIPC</th>
                <th style={th}>AMI</th>
                <th style={th}>Responsável</th>
                <th style={th}>Empreendimentos</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => {
                const responsavel = usuariosEmpresa.find((usuario) => String(usuario.id) === String(cliente.responsavel_angariacao));
                const responsavelNome = responsavel ? `${responsavel.nome || ""} ${responsavel.apelido || ""}`.trim() : "—";
                const totalEmpreendimentos = empreendimentosPorCliente[cliente.id] || 0;

                return (
                  <tr key={cliente.id} style={{ ...tr, cursor: "pointer" }} onClick={() => abrirDetalheCliente(cliente)}>
                    <td style={tdNome}>{cliente.nome_designacao || "Sem designação"}</td>
                    <td style={td}>{cliente.tipo_cliente || "—"}</td>
                    <td style={td}>{cliente.nipc || "—"}</td>
                    <td style={td}>{cliente.ami || "—"}</td>
                    <td style={td}>{responsavelNome}</td>
                    <td style={td}>
                      {podeVerEmpreendimentos ? (
                        <button
                          type="button"
                          style={linkButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (totalEmpreendimentos > 0) {
                              abrirDetalheCliente(cliente);
                            } else {
                              abrirCadastroEmpreendimento(cliente);
                            }
                          }}
                        >
                          {totalEmpreendimentos > 0 ? "Ver empreendimentos" : "+ Cadastrar empreendimento"}
                        </button>
                      ) : "—"}
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); iniciarEdicaoCliente(cliente); }} disabled={!podeEditar}>Editar</Button>
                        <Button size="sm" variant="danger" onClick={(event) => { event.stopPropagation(); excluirCliente(cliente); }} disabled={!podeEliminar}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderImoveisSection = () => (
    <div>
      <div style={submenuEstoque}>
        <button style={moduloAtual === "lista" ? btnSubmenuAtivo : btnSubmenu} onClick={() => setModuloAtual("lista")}>📋 Lista</button>
        <button style={moduloAtual === "cadastro" ? btnSubmenuAtivo : btnSubmenu} onClick={() => setModuloAtual("cadastro")}>➕ Novo cadastro</button>
      </div>

      {moduloAtual === "cadastro" ? (
        <div>
          <div style={barraSuperior}>
            <button style={btnVoltar} onClick={voltarParaLista}>← Voltar para a lista</button>
          </div>

          <CadastroImovel
            proprietario={proprietario}
            setProprietario={(valor) => setField("proprietario", valor)}
            telefone={telefone}
            setTelefone={(valor) => setField("telefone", valor)}
            telefoneErro={telefoneErro}
            handleTelefoneChange={handleTelefoneChange}
            email={email}
            setEmail={(valor) => setField("email", valor)}
            observacoes={observacoes}
            setObservacoes={(valor) => setField("observacoes", valor)}
            valorPretendido={valorPretendido}
            setValorPretendido={(valor) => setField("valorPretendido", valor)}
            valorVenda={valorVenda}
            setValorVenda={(valor) => setField("valorVenda", valor)}
            precoCondominio={precoCondominio}
            setPrecoCondominio={(valor) => setField("precoCondominio", valor)}
            areaBrutaPrivativa={areaBrutaPrivativa}
            setAreaBrutaPrivativa={(valor) => setField("areaBrutaPrivativa", valor)}
            areaUtil={areaUtil}
            setAreaUtil={(valor) => setField("areaUtil", valor)}
            valorM2={valorM2}
            tipologia={tipologia}
            setTipologia={(valor) => setField("tipologia", valor)}
            numeroQuartos={numeroQuartos}
            setNumeroQuartos={(valor) => setField("numeroQuartos", valor)}
            casasBanho={casasBanho}
            setCasasBanho={(valor) => setField("casasBanho", valor)}
            zona={zona}
            setZona={(valor) => setField("zona", valor)}
            codigoPostal={codigoPostal}
            setCodigoPostal={(valor) => setField("codigoPostal", valor)}
            distrito={distrito}
            setDistrito={(valor) => setField("distrito", valor)}
            concelho={concelho}
            setConcelho={(valor) => setField("concelho", valor)}
            freguesia={freguesia}
            setFreguesia={(valor) => setField("freguesia", valor)}
            morada={morada}
            setMorada={(valor) => setField("morada", valor)}
            cmi={cmi}
            setCmi={(valor) => setField("cmi", valor)}
            cadernetaPredial={cadernetaPredial}
            setCadernetaPredial={(valor) => setField("cadernetaPredial", valor)}
            plantas={plantas}
            setPlantas={(valor) => setField("plantas", valor)}
            certificadoEnergetico={certificadoEnergetico}
            setCertificadoEnergetico={(valor) => setField("certificadoEnergetico", valor)}
            cartaoCidadao={cartaoCidadao}
            setCartaoCidadao={(valor) => setField("cartaoCidadao", valor)}
            estacionamento={estacionamento}
            setEstacionamento={(valor) => setField("estacionamento", valor)}
            isEditing={isEditing}
            salvarImovel={salvarImovel}
            cancelar={cancelarNovo}
          />
        </div>
      ) : (
        <div>
          <div style={barraSuperior}>
            <input style={input} placeholder="Pesquisar proprietário..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>

          {imovelSelecionado && (
            <FichaImovel
              imovel={imovelSelecionado}
              ficheiros={ficheiros}
              file={file}
              setFile={setFile}
              uploading={uploading}
              progresso={progresso}
              onUpload={uploadFicheiro}
              onDownload={downloadFicheiro}
              onDelete={apagarFicheiro}
              onExcluirImovel={excluirImovel}
              onSelectFicheiro={(f) => setFicheiroSelecionado(f)}
              ficheiroSelecionado={ficheiroSelecionado}
              setFicheiroSelecionado={setFicheiroSelecionado}
              setImovelSelecionado={setImovelSelecionado}
              cmi={cmi}
              setCmi={(valor) => setField("cmi", valor)}
              cadernetaPredial={cadernetaPredial}
              setCadernetaPredial={(valor) => setField("cadernetaPredial", valor)}
              plantas={plantas}
              setPlantas={(valor) => setField("plantas", valor)}
              certificadoEnergetico={certificadoEnergetico}
              setCertificadoEnergetico={(valor) => setField("certificadoEnergetico", valor)}
              cartaoCidadao={cartaoCidadao}
              setCartaoCidadao={(valor) => setField("cartaoCidadao", valor)}
              estacionamento={estacionamento}
              setEstacionamento={(valor) => setField("estacionamento", valor)}
              onEditar={iniciarEdicaoSelecionado}
            />
          )}

          <div style={tableWrapper}>
            {filtrados.length === 0 ? (
              <div style={{ padding: "16px" }}>
                <EmptyState title="Sem imóveis" description="Não existem imóveis para os filtros aplicados." />
              </div>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Proprietário</th>
                    <th style={th}>Telefone</th>
                    <th style={th}>Tipologia</th>
                    <th style={th}>Zona</th>
                    <th style={th}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((imovel) => (
                    <tr key={imovel.id} style={{ ...tr, cursor: "pointer" }} onClick={() => selecionarImovel(imovel)}>
                      <td style={tdNome}>{imovel.proprietario}</td>
                      <td style={td}>{imovel.telefone}</td>
                      <td style={td}>{imovel.tipologia}</td>
                      <td style={td}>{imovel.zona}</td>
                      <td style={td}>{imovel.valor_pretendido} €</td>
                      <td style={td}>
                        <button type="button" onClick={(event) => { event.stopPropagation(); excluirImovel(imovel); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff1f2", color: "#b91c1c", cursor: "pointer", fontWeight: 600 }}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={pageContainer}>
      <div style={pageHeader}>
        <div>
          <h2 style={pageTitle}>{secaoAtual === "clientes" ? "Empreendimentos" : "Imóveis"}</h2>
          <p style={pageSubtitle}>{secaoAtual === "clientes" ? "Gestão de clientes, empreendimentos, unidades e documentação." : "Gestão de imóveis cadastrados fora do portal."}</p>
        </div>
        {secaoAtual === "clientes" && !clienteDetalhe && moduloAtualClientes === "lista" && podeCriar ? (
          <button style={btnNovo} onClick={abrirNovoCliente}>+ Novo cliente</button>
        ) : null}
      </div>

      {secaoAtual === "clientes" ? (
        podeVer ? (
          clienteDetalhe ? (
            renderClienteDetalhe()
          ) : moduloAtualClientes === "cadastro" ? (
            renderClienteForm()
          ) : (
            <div>
              <div style={{ marginBottom: 12 }}>
                <button style={btnVoltar} onClick={() => setClienteDetalhe(null)}>← Voltar</button>
              </div>
              {renderClientesTable()}
            </div>
          )
        ) : <EmptyState title="Sem acesso" description="Não tem permissão para consultar clientes." />
      ) : renderImoveisSection()}
    </div>
  );
}



//////////////////////////////////////////////////////
// ESTILOS

const pageContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "16px"
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap"
};

const pageTitle = {
  margin: 0,
  fontSize: "1.6rem"
};

const pageSubtitle = {
  margin: "4px 0 0",
  color: "var(--os-color-muted)"
};

const barraSuperior = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px"
};

const submenuEstoque = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px"
};

const btnSubmenu = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)",
  background: "white",
  cursor: "pointer"
};

const btnSubmenuAtivo = {
  ...btnSubmenu,
  background: "var(--os-status-info-text)",
  color: "white",
  borderColor: "var(--os-status-info-text)"
};

const btnVoltar = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)",
  background: "var(--os-color-surface-soft)",
  color: "var(--os-color-text)",
  cursor: "pointer",
  fontWeight: "600",
  boxShadow: "0 1px 2px rgba(15,23,42,0.05)"
};

const input = {
  flex: 1,
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)"
};

const inputForm = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)",
  boxSizing: "border-box"
};

const textarea = {
  width: "100%",
  height: "100px",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)",
  boxSizing: "border-box"
};

const btnNovo = {
  background: "var(--os-status-info-text)",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: "8px",
  cursor: "pointer"
};

const linkButton = {
  background: "transparent",
  border: "none",
  color: "var(--os-status-info-text)",
  cursor: "pointer",
  fontWeight: 600,
  padding: 0,
  textAlign: "left"
};

const btnGuardar = {
  flex: 1,
  background: "var(--os-color-secondary)",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer"
};

const cardNovo = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
};

const tableWrapper = {
  background: "white",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  textAlign: "left",
  padding: "14px",
  background: "var(--os-color-surface-soft)"
};

const thCompact = {
  ...th,
  padding: "8px 10px",
  fontSize: 12,
  whiteSpace: "normal",
  overflowWrap: "anywhere"
};

const tr = {
  borderBottom: "1px solid var(--os-color-border)"
};

const td = {
  padding: "14px"
};

const tdCompact = {
  ...td,
  padding: "8px 10px",
  fontSize: 13,
  verticalAlign: "top",
  overflowWrap: "anywhere"
};

const condicaoRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  alignItems: "end",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid var(--os-color-border)"
};

const unidadeAccentPalette = [
  "#2563eb",
  "#0f766e",
  "#7c3aed",
  "#c2410c",
  "#be123c",
  "#4d7c0f"
];

const getUnidadeAccentColor = (id) => {
  const value = String(id || "");
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return unidadeAccentPalette[Math.abs(hash) % unidadeAccentPalette.length];
};

const obterEstadoFinanceiro = (resumo) => {
  if (resumo.tem_tipo_invalido || resumo.tem_valor_invalido || resumo.tem_percentual_sem_preco || resumo.preco_zero) {
    return { tipo: "incompleto", label: "Incompleto / inválido" };
  }

  if (resumo.etapas.length === 0) {
    return { tipo: "vazio", label: "Sem condições" };
  }

  if (!resumo.todas_etapas_calculaveis) {
    return { tipo: "incompleto", label: "Incompleto / inválido" };
  }

  if (resumo.excedente !== null) {
    return { tipo: "excedente", label: "Excedente" };
  }

  if (resumo.saldo !== null && resumo.saldo > 0) {
    return { tipo: "saldo", label: "Saldo por distribuir" };
  }

  return { tipo: "equilibrado", label: "Plano equilibrado" };
};

const getEstadoBadgeStyle = (tipo) => {
  const palette = {
    equilibrado: { background: "#dcfce7", color: "#166534" },
    saldo: { background: "#fef3c7", color: "#92400e" },
    excedente: { background: "#fee2e2", color: "#991b1b" },
    incompleto: { background: "#ffedd5", color: "#9a3412" },
    vazio: { background: "var(--os-color-surface-soft)", color: "var(--os-color-muted)" }
  };

  return {
    display: "inline-flex",
    alignItems: "center",
    maxWidth: "100%",
    padding: "2px 7px",
    borderRadius: 999,
    background: palette[tipo]?.background || palette.incompleto.background,
    color: palette[tipo]?.color || palette.incompleto.color,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.4,
    whiteSpace: "normal"
  };
};

const panelTh = {
  ...th,
  padding: "4px 6px",
  fontSize: 11,
  whiteSpace: "nowrap"
};

const panelTd = {
  padding: "4px 6px",
  borderBottom: "1px solid var(--os-color-border)",
  verticalAlign: "top",
  overflowWrap: "anywhere"
};

const tdNome = {
  padding: "14px",
  fontWeight: "600"
};

const cardDetalhe = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const headerCard = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "10px"
};

const btnFechar = {
  border: "none",
  background: "transparent",
  cursor: "pointer"
};

const obsBox = {
  marginTop: "10px",
  padding: "10px",
  background: "var(--os-status-warning-surface)",
  borderRadius: "8px"
};

const acoesForm = {
  display: "flex",
  gap: "10px",
  marginTop: "10px"
};

const btnCancelar = {
  flex: 1,
  background: "var(--os-color-muted)",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer"
};

const linhaFicheiro = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px",
  borderBottom: "1px solid var(--os-color-border)"
};

const previewBox = {
  marginTop: "20px",
  padding: "10px",
  background: "var(--os-color-surface-soft)",
  borderRadius: "8px"
};

const imagemPreview = {
  width: "100%",
  borderRadius: "10px"
};

const uploadBox = {
  marginTop: "15px"
};

const uploadTexto = {
  marginBottom: "5px",
  fontWeight: "600",
  color: "var(--os-color-text)"
};

const barraExterna = {
  width: "100%",
  height: "12px",
  background: "var(--os-color-border)",
  borderRadius: "999px",
  overflow: "hidden"
};

const barraInterna = {
  height: "100%",
  background: "var(--os-color-secondary)",
  transition: "0.3s"
}

const galeria = {
  display: "flex",
  flexWrap: "wrap",
  gap: "15px",
  marginTop: "15px"
};

const thumbCard = {
  position: "relative"
};

const thumb = {
  width: "150px",
  height: "100px",
  objectFit: "cover",
  borderRadius: "10px",
  cursor: "pointer",
  border: "1px solid var(--os-color-border)"
};

const btnDeleteImagem = {
  position: "absolute",
  top: "5px",
  right: "5px",

  background: "var(--os-color-danger)",
  color: "white",

  border: "none",
  borderRadius: "50%",

  width: "28px",
  height: "28px",

  cursor: "pointer"
};

const headerPreview = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px"
};;

const thumbContainer = {
  position: "relative"
};

const overlayAcoes = {
  position: "absolute",
  top: "6px",
  right: "6px",

  display: "flex",
  gap: "6px"
};

const iconeOverlay = {
  width: "30px",
  height: "30px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  background: "rgba(255,255,255,0.95)",

  borderRadius: "50%",

  textDecoration: "none",

  cursor: "pointer",

  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
};

const iconeDelete = {
  width: "30px",
  height: "30px",

  border: "none",

  background: "rgba(239,68,68,0.95)",

  color: "white",

  borderRadius: "50%",

  cursor: "pointer",

  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
};

const nomeImagem = {
  marginTop: "8px",
  textAlign: "center",
  fontSize: "13px",
  color: "var(--os-color-muted)",

  maxWidth: "150px",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const iconeDownload = {
  width: "30px",
  height: "30px",

  border: "none",

  background: "rgba(255,255,255,0.95)",

  borderRadius: "50%",

  cursor: "pointer",

  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "12px"
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "12px",
  marginBottom: "12px"
};

const inputFormFull = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)",
  marginBottom: "12px",
  boxSizing: "border-box"
};

const gridDocs = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill,minmax(220px,1fr))",
  gap: "10px",
  marginTop: "10px"
};

const docCard = {
  display: "flex",
  alignItems: "center",
  gap: "6px",

  padding: "8px 12px",

  background: "var(--os-color-surface-soft)",

  border: "1px solid var(--os-color-border)",

  borderRadius: "8px",

  cursor: "pointer",

  fontSize: "14px",

  whiteSpace: "nowrap"
};

const grid5 = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr 1.5fr 1.5fr",
  gap: "12px",
  marginBottom: "12px",
  alignItems: "center"
};

const linhaDocumentos = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "15px"
};

