import { useCallback, useEffect, useState } from "react";
import {
  carregarFichaLead,
  salvarFichaLead,
  transferirLead,
  validarEntradaTelefone
} from "../services/leadsService";
import { canManageLead, canTransferLead } from "../services/leadPermissionService";
import {
  carregarAgentesParaFicha,
  resolverNomeAgente
} from "../services/agentService";
import { notifyError, notifySuccess } from "../../../components/ui/feedbackBus";

export function useFichaLead({ leadId, user }) {
  const [lead, setLead] = useState(null);
  const [form, setForm] = useState(null);
  const [providerLead, setProviderLead] = useState(null);
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [transferindo, setTransferindo] = useState(false);
  const [telefoneErro, setTelefoneErro] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);

    const result = await carregarFichaLead(leadId, user);

    console.log("Lead carregada:", result.lead);
    console.log("agente_id:", result.lead?.agente_id);

    if (result.error) {
      notifyError(result.error.message);
      setLoading(false);
      return;
    }

    setLead(result.lead);
    setForm(result.form);
    setProviderLead(result.providerLead || null);

    const agentesData = await carregarAgentesParaFicha(result.lead?.agente_id, user);
    setAgentes(agentesData);
    setLoading(false);
  }, [leadId, user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function atualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleTelefoneChange(valor) {
    if (form?.telefone_nao_disponivel) {
      setForm((prev) => ({ ...prev, telefone: "" }));
      setTelefoneErro("");
      return;
    }

    const { telefone, erro } = validarEntradaTelefone(valor);
    setForm((prev) => ({ ...prev, telefone, telefone_nao_disponivel: false }));
    setTelefoneErro(erro);
  }

  function handleTelefoneNaoDisponivelChange(checked) {
    const marcado = Boolean(checked);
    setForm((prev) => ({
      ...prev,
      telefone: marcado ? "" : prev.telefone || "",
      telefone_nao_disponivel: marcado
    }));
    setTelefoneErro("");
  }

  function nomeAgente(agenteId) {
    return resolverNomeAgente(agentes, agenteId, user);
  }

  async function salvar() {
    setSalvando(true);

    const result = await salvarFichaLead({
      leadId,
      form,
      user
    });
    setSalvando(false);

    if (result.error) {
      notifyError(result.error.message);
      return result;
    }

    notifySuccess("Ficha da lead atualizada com sucesso.");
    return { error: null };
  }

  async function transferirAgente(agenteId) {
    setTransferindo(true);
    const result = await transferirLead({ leadId, agenteId, user });
    setTransferindo(false);

    if (result.error) {
      notifyError(result.error.message);
      return;
    }

    setLead((prev) => ({ ...prev, agente_id: agenteId || null }));
    setForm((prev) => ({ ...prev, agente_id: agenteId || "" }));
    notifySuccess("Responsável da lead transferido com sucesso.");
  }

  return {
    lead,
    form,
    providerLead,
    agentes,
    loading,
    salvando,
    transferindo,
    telefoneErro,
    atualizar,
    handleTelefoneChange,
    handleTelefoneNaoDisponivelChange,
    nomeAgente,
    salvar,
    transferirAgente,
    canManageLead: (leadAtual) => canManageLead(user, leadAtual),
    canTransferLead: (leadAtual) => canTransferLead(user, leadAtual)
  };
}
