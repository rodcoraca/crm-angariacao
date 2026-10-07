import { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import { getMaturityLabel, getResearchLabel, listCacadorImoveis, requestCacadorResearch } from "../modules/cacador/services/cacadorService";

const euro = (value) => value == null ? "-" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
const date = (value) => value ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(new Date(value)) : "-";

export default function Cacador() {
  const [band, setBand] = useState("60_mais");
  const [privateOnly, setPrivateOnly] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [researchingId, setResearchingId] = useState(null);
  const [notice, setNotice] = useState("");

  async function load() {
    const result = await listCacadorImoveis({ band, privateOnly });
    setRows(result.data);
    setError(result.error);
  }

  useEffect(() => {
    let active = true;
    listCacadorImoveis({ band, privateOnly }).then((result) => {
      if (!active) return;
      setRows(result.data);
      setError(result.error);
    });
    return () => { active = false; };
  }, [band, privateOnly]);

  const counters = useMemo(() => ({
    total: rows.length,
    active: rows.filter((row) => row.cacador_research_status === "active").length,
    changed: rows.filter((row) => row.cacador_research_status === "changed").length,
    removed: rows.filter((row) => row.cacador_research_status === "removed").length
  }), [rows]);

  async function handleResearch(row) {
    setResearchingId(row.id);
    setNotice("");
    const result = await requestCacadorResearch(row.id);
    setResearchingId(null);
    if (result.error) {
      setNotice(result.error.message || "Não foi possível repesquisar o anúncio.");
      return;
    }
    setNotice("Repesquisa concluída.");
    await load();
  }

  const columns = [
    { key: "days_on_market", title: "Mercado", render: (row) => <strong>{row.days_on_market != null ? row.days_on_market + " dias" : "-"}</strong> },
    { key: "title", title: "Imóvel" },
    { key: "price", title: "Preço", render: (row) => euro(row.price) },
    { key: "location", title: "Localização", render: (row) => [row.city, row.district].filter(Boolean).join(", ") || "-" },
    { key: "maturity", title: "Faixa", render: (row) => getMaturityLabel(row.days_on_market) },
    { key: "research", title: "Estado", render: (row) => getResearchLabel(row.cacador_research_status) },
    { key: "last_research", title: "Última repesquisa", render: (row) => date(row.cacador_last_research_at) },
    { key: "actions", title: "Ação", render: (row) => (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {row.url ? <a href={row.url} target="_blank" rel="noreferrer">Anúncio</a> : null}
        <button type="button" onClick={() => handleResearch(row)} disabled={researchingId === row.id}>
          {researchingId === row.id ? "A pesquisar..." : "Repesquisar"}
        </button>
      </div>
    ) }
  ];

  return (
    <section>
      <div style={{ marginBottom: "18px" }}>
        <h1 style={{ marginBottom: "4px" }}>Caçador</h1>
        <p style={{ margin: 0, color: "var(--os-color-text-light)" }}>Imóveis maduros no mercado que merecem uma nova abordagem comercial.</p>
      </div>
      <Card>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => setBand("45_59")}>45 dias</button>
          <button type="button" onClick={() => setBand("60_mais")}>60+ dias</button>
          <button type="button" onClick={() => setBand("all")}>Todos</button>
          <label><input type="checkbox" checked={privateOnly} onChange={(event) => setPrivateOnly(event.target.checked)} /> Apenas particulares</label>
        </div>
      </Card>
      <Card>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <strong>Alvos: {counters.total}</strong>
          <span>Ativos: {counters.active}</span>
          <span>Alterados: {counters.changed}</span>
          <span>Removidos: {counters.removed}</span>
        </div>
      </Card>
      {notice ? <p>{notice}</p> : null}
      {error ? <p>Falha ao carregar Caçador: {error.message}</p> : null}
      <Table columns={columns} rows={rows} emptyMessage="Não existem imóveis nesta faixa de maturidade." />
    </section>
  );
}
