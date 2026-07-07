import { useEffect, useMemo, useState } from "react";
import { normalizarTelefone, validarTelefone } from "../../../telefone";
import { salvarLeadFluxo, validarEntradaTelefone, verificarLeadExistente } from "../services/leadsService";
import { criarFluxoLeads } from "../utils/flowConfig";
import { limparLeadSelecionada, recuperarLeadSelecionada } from "../utils/leadStorage";
import { notifyError, notifyInfo, notifySuccess } from "../../../components/ui/feedbackBus";

const FLUXO_RASCUNHO_STORAGE_KEY = "osflow_fluxo_rascunho";

export function useFluxoLead({ user, onAbrirLead }) {
  const [etapa, setEtapa] = useState("origem");
  const [historico, setHistorico] = useState([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneErro, setTelefoneErro] = useState("");
  const [origem, setOrigem] = useState("");
  const [observacao, setObservacao] = useState("");
  const [mostrarObs, setMostrarObs] = useState(false);
  const [qualificacaoVeioDaObjecao, setQualificacaoVeioDaObjecao] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState("");
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);
  const [ultimoLookupTelefone, setUltimoLookupTelefone] = useState("");
  const [ultimoLookupResultado, setUltimoLookupResultado] = useState(null);

  useEffect(() => {
    const lead = recuperarLeadSelecionada();

    if (lead) {
      setHistorico([]);
      setMostrarObs(false);
      setNome(lead.nome);
      setTelefone(lead.telefone);
      setOrigem(lead.origem);
      setObservacao(lead.observacoes || "");
      setEtapa("lista");
      setTipoSelecionado(lead.tipo);
      setLeadSelecionadoId(lead.id);
      limparLeadSelecionada();
    }
  }, []);

  const fluxo = useMemo(
    () => criarFluxoLeads(origem, qualificacaoVeioDaObjecao),
    [origem, qualificacaoVeioDaObjecao]
  );

  const node = fluxo[etapa] || fluxo.origem;

  async function handleTelefoneChange(valor) {
    const { telefone: telefoneNormalizado, erro } = validarEntradaTelefone(valor);
    setTelefone(telefoneNormalizado);

    if (erro) {
      setTelefoneErro(`${erro}\n`);
      return;
    }

    setTelefoneErro("");

    const result =
      ultimoLookupTelefone === telefoneNormalizado && ultimoLookupResultado
        ? ultimoLookupResultado
        : await verificarLeadExistente(telefoneNormalizado);

    setUltimoLookupTelefone(telefoneNormalizado);
    setUltimoLookupResultado(result);

    if (result.error) {
      notifyError(result.error.message);
      return;
    }

    if (result.lead) {
      setTelefoneErro("Este telefone já está cadastrado. A abrir a ficha existente.");
      onAbrirLead?.(result.lead.id);
    }
  }

  async function handleClick(proximo, origemSelecionada) {
    if (etapa === "dados") {
      const telefoneNormalizado = normalizarTelefone(telefone);
      if (!validarTelefone(telefoneNormalizado)) {
        setTelefone(telefoneNormalizado);
        setTelefoneErro("Informe o telefone com 12 dígitos (indicativo + 9 dígitos).\n");
        notifyError("Informe o telefone com 12 dígitos (indicativo + 9 dígitos).");
        return;
      }

      const result =
        ultimoLookupTelefone === telefoneNormalizado && ultimoLookupResultado
          ? ultimoLookupResultado
          : await verificarLeadExistente(telefoneNormalizado);

      setUltimoLookupTelefone(telefoneNormalizado);
      setUltimoLookupResultado(result);

      if (result.error) {
        notifyError(result.error.message);
        return;
      }

      if (result.lead) {
        notifyInfo("Já existe uma lead com este telefone. A abrir a ficha existente.");
        onAbrirLead?.(result.lead.id);
        return;
      }
    }

    if (origemSelecionada) {
      setOrigem(origemSelecionada);
    }

    setHistorico((prev) => [...prev, etapa]);

    const proximoNode = fluxo[proximo];
    if (proximoNode?.tipo) {
      if (proximoNode.pedirObs) {
        setMostrarObs(true);
        return;
      }

      await salvarLead(proximoNode.tipo);
      return;
    }

    setEtapa(proximo);
  }

  function voltar() {
    if (historico.length === 0) return;

    const novoHistorico = [...historico];
    const ultima = novoHistorico.pop();
    setHistorico(novoHistorico);
    setMostrarObs(false);

    if (ultima === "origem") {
      setOrigem("");
      setNome("");
      setTelefone("");
      setObservacao("");
      setTipoSelecionado("");
      setLeadSelecionadoId(null);
    }

    setEtapa(ultima || "origem");
  }

  async function salvarLead(tipo) {
    const result = await salvarLeadFluxo({
      nome,
      telefone,
      tipo,
      origem,
      observacao,
      user
    });

    if (result.error) {
      notifyError(result.error.message);
      return;
    }

    if (result.duplicateLead) {
      notifyInfo("Já existe uma lead com este telefone. A abrir a ficha existente.");
      onAbrirLead?.(result.duplicateLead.id);
      return;
    }

    notifySuccess("Lead guardada com sucesso.");
    window.localStorage.removeItem(FLUXO_RASCUNHO_STORAGE_KEY);
    setEtapa("origem");
    setHistorico([]);
    setNome("");
    setTelefone("");
    setTelefoneErro("");
    setOrigem("");
    setObservacao("");
    setMostrarObs(false);
    setQualificacaoVeioDaObjecao(false);
    setTipoSelecionado("");
    setLeadSelecionadoId(null);
    setUltimoLookupTelefone("");
    setUltimoLookupResultado(null);
  }

  function guardarEContinuarDepois() {
    const rascunho = {
      etapa,
      historico,
      nome,
      telefone,
      telefoneErro,
      origem,
      observacao,
      mostrarObs,
      qualificacaoVeioDaObjecao,
      tipoSelecionado,
      leadSelecionadoId,
      ultimoLookupTelefone,
      timestamp: new Date().toISOString()
    };

    try {
      window.localStorage.setItem(FLUXO_RASCUNHO_STORAGE_KEY, JSON.stringify(rascunho));
      notifySuccess("Fluxo guardado. Pode continuar depois.");
    } catch (error) {
      notifyError("Não foi possível guardar o estado atual do fluxo.");
    }
  }

  function retomarFluxoGuardado() {
    try {
      const raw = window.localStorage.getItem(FLUXO_RASCUNHO_STORAGE_KEY);
      if (!raw) {
        notifyInfo("Não existe fluxo guardado para retomar.");
        return false;
      }

      const rascunho = JSON.parse(raw);
      setEtapa(rascunho.etapa || "origem");
      setHistorico(Array.isArray(rascunho.historico) ? rascunho.historico : []);
      setNome(rascunho.nome || "");
      setTelefone(rascunho.telefone || "");
      setTelefoneErro(rascunho.telefoneErro || "");
      setOrigem(rascunho.origem || "");
      setObservacao(rascunho.observacao || "");
      setMostrarObs(Boolean(rascunho.mostrarObs));
      setQualificacaoVeioDaObjecao(Boolean(rascunho.qualificacaoVeioDaObjecao));
      setTipoSelecionado(rascunho.tipoSelecionado || "");
      setLeadSelecionadoId(rascunho.leadSelecionadoId || null);
      setUltimoLookupTelefone(rascunho.ultimoLookupTelefone || "");
      setUltimoLookupResultado(null);
      notifySuccess("Fluxo retomado a partir do estado guardado.");
      return true;
    } catch (error) {
      notifyError("Não foi possível retomar o fluxo guardado.");
      return false;
    }
  }

  function existeFluxoGuardado() {
    return Boolean(window.localStorage.getItem(FLUXO_RASCUNHO_STORAGE_KEY));
  }

  return {
    etapa,
    historico,
    nome,
    telefone,
    telefoneErro,
    origem,
    observacao,
    mostrarObs,
    tipoSelecionado,
    leadSelecionadoId,
    node,
    setNome,
    setObservacao,
    handleTelefoneChange,
    handleClick,
    voltar,
    salvarLead,
    guardarEContinuarDepois,
    retomarFluxoGuardado,
    existeFluxoGuardado
  };
}
