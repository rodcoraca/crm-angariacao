import CadastroImovel from "./CadastroImovel";
import FichaImovel from "./FichaImovel";
import { useEstoqueImoveis } from "./modules/imoveis";
import { useClientes } from "./modules/clientes";
import { useEmpreendimentos } from "./modules/empreendimentos/hooks/useEmpreendimentos";
import { useEmpreendimentoCondicoesPagamento } from "./modules/empreendimentos/hooks/useEmpreendimentoCondicoesPagamento";
import { useUnidades } from "./modules/empreendimentos/hooks/useUnidades";
import Button from "./components/ui/Button";
import Input from "./components/ui/Input";
import Select from "./components/ui/Select";
import EmptyState from "./components/ui/EmptyState";
import Tooltip from "./components/ui/Tooltip";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    setSecaoAtual(defaultSection);
  }, [defaultSection]);

  useEffect(() => {
    if (!clienteDetalhe) {
      setEmpreendimentoDetalhe(null);
      return;
    }

    setEmpreendimentoDetalhe(null);
    setMostrarFormulario(false);
  }, [clienteDetalhe, setMostrarFormulario]);

  useEffect(() => {
    if (!empreendimentoDetalhe?.id) {
      return;
    }

    carregarDocumentosEmpreendimento(empreendimentoDetalhe.id);
  }, [empreendimentoDetalhe?.id, carregarDocumentosEmpreendimento]);

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
    setMostrarFormulario(false);
  };

  const voltarParaListaClientes = () => {
    setClienteDetalhe(null);
    setEmpreendimentoDetalhe(null);
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

  const renderUnidades = () => (
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
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Fração</th>
                <th style={th}>Tipologia</th>
                <th style={th}>Área Bruta Privativa</th>
                <th style={th}>Área Total</th>
                <th style={th}>Área Dependente</th>
                <th style={th}>Varanda</th>
                <th style={th}>Terraço</th>
                <th style={th}>Garagem</th>
                <th style={th}>Planta</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {unidades.map((unidade) => {
                const planta = unidade?.planta || null;

                return (
                  <tr key={unidade.id}>
                    <td style={td}>{unidade.fracao || "—"}</td>
                    <td style={td}>{unidade.tipologia || "—"}</td>
                    <td style={td}>{unidade.area_bruta_privativa != null ? `${unidade.area_bruta_privativa} m²` : "—"}</td>
                    <td style={td}>{unidade.area_total != null ? `${unidade.area_total} m²` : "—"}</td>
                    <td style={td}>{unidade.area_dependente != null ? `${unidade.area_dependente} m²` : "—"}</td>
                    <td style={td}>{unidade.varanda ? "Sim" : "Não"}</td>
                    <td style={td}>{unidade.terraco ? "Sim" : "Não"}</td>
                    <td style={td}>{unidade.lugares_garagem ?? "—"}</td>
                    <td style={td}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                        {planta ? (
                          <>
                            <a href={planta.url} target="_blank" rel="noreferrer" style={{ color: "var(--os-color-primary)", textDecoration: "none", fontWeight: 600 }}>
                              {planta.nome || "Abrir planta"}
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
                              <Button size="sm" variant="ghost" onClick={() => deletePlanta(planta)} disabled={!podeEliminarUnidades}>Eliminar</Button>
                            </div>
                          </>
                        ) : (
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
                            + Adicionar planta
                          </label>
                        )}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Button size="sm" variant="ghost" onClick={() => { setMostrarFormularioUnidade(true); iniciarEdicaoUnidade(unidade); }} disabled={!podeEditarUnidades}>Editar</Button>
                        <Button size="sm" variant="light" onClick={() => { setMostrarFormularioUnidade(true); duplicarUnidade(unidade); }} disabled={!podeDuplicarUnidades}>Duplicar</Button>
                        <Button size="sm" variant="danger" onClick={() => excluirUnidade(unidade)} disabled={!podeEliminarUnidades}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );

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
        <div style={{ display: "grid", gap: 12 }}>
          {condicoes.map((condicao, index) => {
            const isBaseStep = ["Entrada", "CPCV", "Escritura"].includes(condicao.nome_etapa || "");
            const canManageStep = (podeEditarCondicoes || podeCriarCondicoes) && !isBaseStep;
            const valorInputLabel = condicao.tipo_valor === "percentual" ? "%" : "€";

            return (
              <div key={`${condicao.nome_etapa}-${index}`} style={{ border: "1px solid var(--os-color-border)", borderRadius: 12, padding: 12, background: "var(--os-color-surface-soft)" }}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Input
                      label="Nome"
                      value={condicao.nome_etapa || ""}
                      onChange={(e) => atualizarCondicao(index, "nome_etapa", e.target.value)}
                      disabled={!podeEditarCondicoes && !podeCriarCondicoes}
                    />
                    {canManageStep ? (
                      <Button variant="danger" size="sm" onClick={() => removerEtapa(index)}>Eliminar</Button>
                    ) : null}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Select
                      label="Tipo de valor"
                      placeholder="Selecione"
                      value={condicao.tipo_valor || "fixo"}
                      onChange={(e) => atualizarCondicao(index, "tipo_valor", e.target.value)}
                      options={[{ value: "fixo", label: "Valor fixo" }, { value: "percentual", label: "Percentual" }]}
                      disabled={!podeEditarCondicoes && !podeCriarCondicoes}
                    />
                    <div>
                      <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Valor</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", right: 12, top: 11, color: "var(--os-color-muted)" }}>{valorInputLabel}</span>
                        <input
                          type="number"
                          step={condicao.tipo_valor === "percentual" ? "0.01" : "0.01"}
                          min={condicao.tipo_valor === "percentual" ? "0" : "0"}
                          max={condicao.tipo_valor === "percentual" ? "100" : undefined}
                          value={condicao.valor ?? ""}
                          onChange={(e) => atualizarCondicao(index, "valor", e.target.value)}
                          disabled={!podeEditarCondicoes && !podeCriarCondicoes}
                          style={{ width: "100%", padding: "10px 38px 10px 10px", borderRadius: 8, border: "1px solid var(--os-color-border)", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Select
                      label="Valor negociável"
                      placeholder="Selecione"
                      value={condicao.negociavel ? "sim" : "nao"}
                      onChange={(e) => atualizarCondicao(index, "negociavel", e.target.value === "sim")}
                      options={[{ value: "nao", label: "Não" }, { value: "sim", label: "Sim" }]}
                      disabled={!podeEditarCondicoes && !podeCriarCondicoes}
                    />
                  </div>

                  {condicao.negociavel ? (
                    <Input
                      label="Condição de negociação"
                      value={condicao.condicao_negociacao || ""}
                      onChange={(e) => atualizarCondicao(index, "condicao_negociacao", e.target.value)}
                      disabled={!podeEditarCondicoes && !podeCriarCondicoes}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {errorCondicoes ? <div style={{ color: "var(--os-color-danger)", fontWeight: 600, marginTop: 12 }}>{errorCondicoes}</div> : null}

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
                <tr key={empreendimento.id} style={{ ...tr, cursor: "pointer" }} onClick={() => { setEmpreendimentoDetalhe(empreendimento); setMostrarFormulario(false); }}>
                  <td style={tdNome}>{empreendimento.nome || "—"}</td>
                  <td style={td}>{[empreendimento.distrito, empreendimento.concelho, empreendimento.freguesia].filter(Boolean).join(" / ") || "—"}</td>
                  <td style={td}>{empreendimento.percentual_comissao != null ? `${empreendimento.percentual_comissao}%` : "—"}</td>
                  <td style={td}>{empreendimento.inicio_obras ? new Date(empreendimento.inicio_obras).toLocaleDateString("pt-PT") : "—"}</td>
                  <td style={td}>{empreendimento.previsao_entrega ? new Date(empreendimento.previsao_entrega).toLocaleDateString("pt-PT") : "—"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); iniciarEdicaoEmpreendimento(empreendimento); }} disabled={!podeEditarEmpreendimento}>Editar</Button>
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
            <Button variant="light" onClick={() => setEmpreendimentoDetalhe(null)}>Voltar para empreendimentos</Button>
            {podeEditarEmpreendimento ? <Button onClick={() => iniciarEdicaoEmpreendimento(empreendimentoDetalhe)}>Editar empreendimento</Button> : null}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: 0, marginBottom: 12 }}>Dados do Empreendimento</h4>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div style={{ background: "var(--os-color-surface-soft)", padding: 12, borderRadius: 8 }}><strong>Comissão</strong><div>{empreendimentoDetalhe?.percentual_comissao != null ? `${empreendimentoDetalhe.percentual_comissao}%` : "—"}</div></div>
          <div style={{ background: "var(--os-color-surface-soft)", padding: 12, borderRadius: 8 }}><strong>Início das obras</strong><div>{empreendimentoDetalhe?.inicio_obras ? new Date(empreendimentoDetalhe.inicio_obras).toLocaleDateString("pt-PT") : "—"}</div></div>
          <div style={{ background: "var(--os-color-surface-soft)", padding: 12, borderRadius: 8 }}><strong>Previsão de entrega</strong><div>{empreendimentoDetalhe?.previsao_entrega ? new Date(empreendimentoDetalhe.previsao_entrega).toLocaleDateString("pt-PT") : "—"}</div></div>
        </div>
      </div>

      {renderCondicoesPagamento()}
      {renderUnidades()}
      {renderDocumentosEmpreendimento()}
    </div>
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
        empreendimentoDetalhe ? renderEmpreendimentoDetalhe() : mostrarFormulario ? renderEmpreendimentoForm() : renderEmpreendimentosTable()
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
        {podeCriar ? (
          <button style={btnNovo} onClick={abrirNovoCliente}>+ Novo Cliente</button>
        ) : null}
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
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => {
                const responsavel = usuariosEmpresa.find((usuario) => String(usuario.id) === String(cliente.responsavel_angariacao));
                const responsavelNome = responsavel ? `${responsavel.nome || ""} ${responsavel.apelido || ""}`.trim() : "—";

                return (
                  <tr key={cliente.id} style={{ ...tr, cursor: "pointer" }} onClick={() => abrirDetalheCliente(cliente)}>
                    <td style={tdNome}>{cliente.nome_designacao || "Sem designação"}</td>
                    <td style={td}>{cliente.tipo_cliente || "—"}</td>
                    <td style={td}>{cliente.nipc || "—"}</td>
                    <td style={td}>{cliente.ami || "—"}</td>
                    <td style={td}>{responsavelNome}</td>
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

const tr = {
  borderBottom: "1px solid var(--os-color-border)"
};

const td = {
  padding: "14px"
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

