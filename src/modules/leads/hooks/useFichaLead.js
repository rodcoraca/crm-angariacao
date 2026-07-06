import { useCallback, useEffect, useState } from "react";
import {
  carregarFichaLead,
  salvarFichaLead,
  validarEntradaTelefone
} from "../services/leadsService";
import {
  carregarAgentesParaFicha,
  resolverNomeAgente
} from "../services/agentService";
import { notifyError, notifySuccess } from "../../../components/ui/feedbackBus";

export function useFichaLead({ leadId, user, voltar }) {
  const [lead, setLead] = useState(null);
  const [form, setForm] = useState(null);
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [telefoneErro, setTelefoneErro] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);

    const result = await carregarFichaLead(leadId);

    if (result.error) {
      notifyError(result.error.message);
      setLoading(false);
      return;
    }

    setLead(result.lead);
    setForm(result.form);

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
    const { telefone, erro } = validarEntradaTelefone(valor);
    setForm((prev) => ({ ...prev, telefone }));
    setTelefoneErro(erro);
  }

  function nomeAgente(agenteId) {
    return resolverNomeAgente(agentes, agenteId, user);
  }

  async function salvar() {
    setSalvando(true);

    const result = await salvarFichaLead({
      leadId,
      form,
      user,
      leadAtual: lead
    });
    setSalvando(false);

    if (result.error) {
      notifyError(result.error.message);
      return;
    }

    notifySuccess("Ficha da lead atualizada com sucesso.");
    voltar?.();
  }

  return {
    lead,
    form,
    agentes,
    loading,
    salvando,
    telefoneErro,
    atualizar,
    handleTelefoneChange,
    nomeAgente,
    salvar
  };
}
