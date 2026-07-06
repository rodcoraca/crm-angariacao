import { useEffect, useMemo, useState } from "react";
import { normalizarTelefone, validarTelefone } from "../../../telefone";
import { salvarLeadFluxo, validarEntradaTelefone, verificarLeadExistente } from "../services/leadsService";
import { criarFluxoLeads } from "../utils/flowConfig";
import { limparLeadSelecionada, recuperarLeadSelecionada } from "../utils/leadStorage";
import { notifyError, notifyInfo, notifySuccess } from "../../../components/ui/feedbackBus";

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
    salvarLead
  };
}
