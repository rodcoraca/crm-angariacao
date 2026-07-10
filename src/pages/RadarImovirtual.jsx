import { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import { listImovirtualLeads } from "../services/providerLeadService";

const euro = (value) => value == null ? "-" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
const date = (value) => value ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "-";

/** Página isolada para registo manual futuro em Radar > Imovirtual. */
export default function RadarImovirtual() {
  const [filters, setFilters] = useState({ privateOnly: false, last24Hours: false, district: "", minPrice: "", maxPrice: "" });
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => { let active = true; listImovirtualLeads(filters).then((result) => { if (active) { setLeads(result.data); setError(result.error); } }); return () => { active = false; }; }, [filters]);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const totalPrivate = leads.filter((lead) => lead.is_private_owner).length;
  const lastSync = leads.reduce((latest, lead) => !latest || new Date(lead.detected_at) > new Date(latest) ? lead.detected_at : latest, null);
  const columns = [
    { key: "owner_name", title: "Proprietário", render: (row) => row.owner_name || "-" },
    { key: "title", title: "Imóvel" },
    { key: "price", title: "Preço", render: (row) => euro(row.price) },
    { key: "location", title: "Localização", render: (row) => [row.city, row.district].filter(Boolean).join(", ") || "-" },
    { key: "created_at_first", title: "Data publicação", render: (row) => date(row.created_at_first) },
    { key: "url", title: "Abrir anúncio", render: (row) => row.url ? <a href={row.url} target="_blank" rel="noreferrer">Abrir anúncio</a> : "-" }
  ];
  return <section><h1>Radar &gt; Imovirtual Beta</h1><Card><p>Total anúncios: {leads.length}</p><p>Total particulares: {totalPrivate}</p><p>Última sincronização: {date(lastSync)}</p></Card><Card><label><select value={filters.privateOnly ? "private" : "all"} onChange={(event) => setFilter("privateOnly", event.target.value === "private")}><option value="all">Todos</option><option value="private">Apenas particulares</option></select></label><label><input type="checkbox" checked={filters.last24Hours} onChange={(event) => setFilter("last24Hours", event.target.checked)} /> Últimas 24h</label><label>Distrito <input value={filters.district} onChange={(event) => setFilter("district", event.target.value)} /></label></Card>{error ? <p>Falha ao carregar anúncios: {error.message}</p> : <Table columns={columns} rows={leads} emptyMessage="Sem anúncios Imovirtual." />}</section>;
}
