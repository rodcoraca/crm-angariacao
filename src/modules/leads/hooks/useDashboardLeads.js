import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import { applyEmpresaScope, resolveEmpresaId } from "../../../utils/empresaScope";
import { carregarLeadsDashboard } from "../services/leadsService";
import {
  construirCsvLeads,
  filtrarLeadsDashboard,
  formatarDataDashboard
} from "../viewmodels/leadsViewModel";
import { resolverNomeAgente } from "../services/agentService";

export function useDashboardLeads({ onAbrirLead, theme, user }) {
  const [leads, setLeads] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroUtilizador, setFiltroUtilizador] = useState("");
  const [opcoesUtilizador, setOpcoesUtilizador] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [busca, setBusca] = useState("");
  const [leadSelecionado, setLeadSelecionado] = useState(null);

  useEffect(() => {
    async function carregar() {
      const result = await carregarLeadsDashboard();
      setLeads(result.data || []);
    }

    async function carregarUtilizadores() {
      const empresaId = await resolveEmpresaId(user);
      if (!empresaId) {
        setOpcoesUtilizador([]);
        setAgentes([]);
        return;
      }

      const { data, error } = await applyEmpresaScope(
        supabase
          .from("usuarios")
          .select("id, nome, email, empresa_id, ativo")
          .eq("ativo", true),
        empresaId
      ).order("nome", { ascending: true });

      if (error) {
        setOpcoesUtilizador([]);
        setAgentes([]);
        return;
      }

      const agentesData = (data || []).map((usuario) => ({
        id: usuario.id,
        nome: usuario.nome || usuario.email || "Utilizador não encontrado",
        email: usuario.email || ""
      }));

      setAgentes(agentesData);
      setOpcoesUtilizador(
        agentesData.map((usuario) => ({
          value: String(usuario.id),
          label: usuario.nome || "Utilizador"
        }))
      );
    }

    carregar();
    carregarUtilizadores();
  }, [user]);

  const dados = useMemo(
    () => filtrarLeadsDashboard(leads, busca, filtroTipo, filtroUtilizador, filtroStatus),
    [leads, busca, filtroTipo, filtroUtilizador, filtroStatus]
  );

  function exportarCSV() {
    const csv = construirCsvLeads(dados);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
  }

  function getInteractiveCellProps(lead) {
    return {
      onClick: () => onAbrirLead?.(lead.id),
      onMouseEnter: (event) => {
        const row = event.currentTarget.closest("tr");
        if (row) row.style.background = theme.colors.surfaceSoft;
      },
      onMouseLeave: (event) => {
        const row = event.currentTarget.closest("tr");
        if (row) row.style.background = theme.colors.surface;
      }
    };
  }

  function nomeAgente(agenteId) {
    return resolverNomeAgente(agentes, agenteId, user);
  }

  return {
    filtroTipo,
    filtroStatus,
    filtroUtilizador,
    busca,
    leadSelecionado,
    dados,
    opcoesUtilizador,
    setFiltroTipo,
    setFiltroStatus,
    setFiltroUtilizador,
    setBusca,
    setLeadSelecionado,
    exportarCSV,
    getInteractiveCellProps,
    nomeAgente,
    formatarData: formatarDataDashboard
  };
}
