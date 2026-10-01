import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import { applyEmpresaScope, resolveEmpresaId } from "../../../utils/empresaScope";
import { carregarLeadsDashboard } from "../services/leadsService";
import {
  construirCsvLeads,
  filtrarLeadsDashboard,
  formatarDataDashboard
} from "../viewmodels/leadsViewModel";
import { resolverNomeAgente } from "../services/agentService";
import {
  DEFAULT_DASHBOARD_FILTERS,
  readDashboardFilters,
  writeDashboardFilters
} from "../utils/dashboardState";

function resolveDashboardStorageScope(user) {
  const empresaId = user?.empresa_id || user?.user_metadata?.empresa_id || "empresa";
  const userId = user?.id || user?.perfil_id || user?.auth_user_id || "usuario";

  return {
    empresaId: String(empresaId || "empresa"),
    userId: String(userId || "usuario")
  };
}

export function useDashboardLeads({ onAbrirLead, theme, user }) {
  const storageScope = useMemo(() => resolveDashboardStorageScope(user), [user]);
  const [leads, setLeads] = useState([]);
  const [opcoesUtilizador, setOpcoesUtilizador] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [filtros, setFiltros] = useState(() => ({
    ...DEFAULT_DASHBOARD_FILTERS,
    ...readDashboardFilters(storageScope)
  }));

  useEffect(() => {
    const restored = readDashboardFilters(storageScope);
    setFiltros((prev) => {
      const next = { ...DEFAULT_DASHBOARD_FILTERS, ...restored };
      if (
        prev.busca === next.busca &&
        prev.filtroTipo === next.filtroTipo &&
        prev.filtroStatus === next.filtroStatus &&
        prev.filtroUtilizador === next.filtroUtilizador
      ) {
        return prev;
      }

      return next;
    });
  }, [storageScope]);

  const setFiltroTipo = (value) => setFiltros((prev) => ({ ...prev, filtroTipo: value }));
  const setFiltroStatus = (value) => setFiltros((prev) => ({ ...prev, filtroStatus: value }));
  const setFiltroUtilizador = (value) => setFiltros((prev) => ({ ...prev, filtroUtilizador: value }));
  const setBusca = (value) => setFiltros((prev) => ({ ...prev, busca: value }));

  const { busca, filtroTipo, filtroStatus, filtroUtilizador } = filtros;

  useEffect(() => {
    writeDashboardFilters({
      empresaId: storageScope.empresaId,
      userId: storageScope.userId,
      filters: filtros
    });
  }, [storageScope.empresaId, storageScope.userId, filtros]);

  const refetchLeads = useCallback(async () => {
    const result = await carregarLeadsDashboard();
    setLeads(result.data || []);
    return result;
  }, []);

  useEffect(() => {
    void refetchLeads();

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

    carregarUtilizadores();
  }, [refetchLeads, user]);

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
    refetchLeads,
    getInteractiveCellProps,
    nomeAgente,
    formatarData: formatarDataDashboard
  };
}
