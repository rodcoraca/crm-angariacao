import { useEffect, useMemo, useState } from "react";
import { carregarLeadsDashboard } from "../services/leadsService";
import {
  construirCsvLeads,
  filtrarLeadsDashboard,
  formatarDataDashboard
} from "../viewmodels/leadsViewModel";

export function useDashboardLeads({ onAbrirLead, theme }) {
  const [leads, setLeads] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [leadSelecionado, setLeadSelecionado] = useState(null);

  useEffect(() => {
    async function carregar() {
      const result = await carregarLeadsDashboard();
      setLeads(result.data || []);
    }

    carregar();
  }, []);

  const dados = useMemo(
    () => filtrarLeadsDashboard(leads, busca, filtroTipo),
    [leads, busca, filtroTipo]
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

  return {
    filtroTipo,
    busca,
    leadSelecionado,
    dados,
    setFiltroTipo,
    setBusca,
    setLeadSelecionado,
    exportarCSV,
    getInteractiveCellProps,
    formatarData: formatarDataDashboard
  };
}
