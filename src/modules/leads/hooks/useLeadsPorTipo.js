import { useCallback, useEffect, useState } from "react";
import {
  alterarTipoLead,
  carregarLeadsPorTipo,
  salvarObservacaoLead
} from "../services/leadsService";
import { canManageLead, canTransferLead } from "../services/leadPermissionService";
import {
  carregarAgentesParaLeads,
  resolverNomeAgente
} from "../services/agentService";

export function useLeadsPorTipo({ tipo, user, onAbrirLead }) {
  const [leads, setLeads] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const carregar = useCallback(async () => {
    const result = await carregarLeadsPorTipo(tipo);

    if (!result.error) {
      const leadsCarregadas = result.data || [];
      setLeads(leadsCarregadas);
      const agentesData = await carregarAgentesParaLeads(leadsCarregadas, user);
      setAgentes(agentesData);
    }
  }, [tipo, user]);

  useEffect(() => {
    carregar();
  }, [carregar, refreshKey]);

  function atualizarObsLocal(id, texto) {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id ? { ...lead, observacoes: texto } : lead
      )
    );
  }

  async function alterarTipo(id, novoTipo) {
    const { error } = await alterarTipoLead(id, novoTipo, user);

    if (error) {
      return { error };
    }

    setRefreshKey((value) => value + 1);
    return { error: null };
  }

  async function salvarObservacao(id, texto) {
    const { error } = await salvarObservacaoLead(id, texto, user);

    if (error) {
      return { error };
    }

    setRefreshKey((value) => value + 1);
    return { error: null };
  }

  function abrirFicha(leadId) {
    setLeadSelecionadoId(leadId);
    onAbrirLead?.(leadId);
  }

  function fecharFicha() {
    setLeadSelecionadoId(null);
    setRefreshKey((value) => value + 1);
  }

  function nomeAgente(agenteId) {
    return resolverNomeAgente(agentes, agenteId, user) || "Sem agente";
  }

  return {
    leads,
    leadSelecionadoId,
    abrirFicha,
    fecharFicha,
    atualizarObsLocal,
    alterarTipo,
    salvarObservacao,
    nomeAgente,
    canManageLead: (lead) => canManageLead(user, lead),
    canTransferLead: (lead) => canTransferLead(user, lead)
  };
}
