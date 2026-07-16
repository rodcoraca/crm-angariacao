import { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import { listImovirtualLeads } from "../services/providerLeadService";

const euro = (value) => value == null ? "-" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
const date = (value) => value ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "-";

function normalizeText(value) {
  return String(value || "").trim();
}

function resolveGeoField(row, fieldNames = []) {
  for (const fieldName of fieldNames) {
    const directValue = normalizeText(row?.[fieldName]);
    if (directValue) return directValue;

    const rawValue = normalizeText(row?.raw_data?.[fieldName]);
    if (rawValue) return rawValue;
  }

  return "";
}

function getGeoFields(row) {
  return {
    district: resolveGeoField(row, ["district", "distrito"]),
    concelho: resolveGeoField(row, ["municipality", "county", "concelho"]),
    freguesia: resolveGeoField(row, ["freguesia", "parish"]),
    city: resolveGeoField(row, ["city", "cidade"])
  };
}

function buildLocationLabel(row) {
  const { district, concelho, freguesia, city } = getGeoFields(row);
  return [freguesia, concelho, district, city].filter(Boolean).join(", ") || "-";
}

function matchesGeoFilter(row, filters) {
  const { district, concelho, freguesia } = getGeoFields(row);
  if (filters.district && district.toLowerCase() !== filters.district.toLowerCase()) return false;
  if (filters.concelho && concelho.toLowerCase() !== filters.concelho.toLowerCase()) return false;
  if (filters.freguesia && freguesia.toLowerCase() !== filters.freguesia.toLowerCase()) return false;
  return true;
}

/** Página isolada para registo manual futuro em Radar > Imovirtual. */
export default function RadarImovirtual() {
  const [filters, setFilters] = useState({ privateOnly: false, last24Hours: false, district: "", concelho: "", freguesia: "", minPrice: "", maxPrice: "" });
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => { let active = true; listImovirtualLeads(filters).then((result) => { if (active) { setLeads(result.data); setError(result.error); } }); return () => { active = false; }; }, [filters]);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const totalPrivate = leads.filter((lead) => lead.is_private_owner).length;
  const lastSync = leads.reduce((latest, lead) => !latest || new Date(lead.detected_at) > new Date(latest) ? lead.detected_at : latest, null);
  const filteredLeads = leads.filter((lead) => matchesGeoFilter(lead, filters));
  const geoOptions = filteredLeads.reduce((acc, row) => {
    const { district, concelho, freguesia } = getGeoFields(row);
    if (district) acc.districts.add(district);
    if (concelho) acc.concelhos.add(concelho);
    if (freguesia) acc.freguesias.add(freguesia);
    return acc;
  }, { districts: new Set(), concelhos: new Set(), freguesias: new Set() });
  const columns = [
    { key: "owner_name", title: "Proprietário", render: (row) => row.owner_name || "-" },
    { key: "title", title: "Imóvel" },
    { key: "price", title: "Preço", render: (row) => euro(row.price) },
    { key: "location", title: "Localização", render: (row) => buildLocationLabel(row) },
    { key: "created_at_first", title: "Data publicação", render: (row) => date(row.created_at_first) },
    { key: "url", title: "Abrir anúncio", render: (row) => row.url ? <a href={row.url} target="_blank" rel="noreferrer">Abrir anúncio</a> : "-" }
  ];
  return <section><h1>Radar &gt; Imovirtual Beta</h1><Card><p>Total anúncios: {leads.length}</p><p>Total particulares: {totalPrivate}</p><p>Última sincronização: {date(lastSync)}</p></Card><Card><label><select value={filters.privateOnly ? "private" : "all"} onChange={(event) => setFilter("privateOnly", event.target.value === "private")}><option value="all">Todos</option><option value="private">Apenas particulares</option></select></label><label><input type="checkbox" checked={filters.last24Hours} onChange={(event) => setFilter("last24Hours", event.target.checked)} /> Últimas 24h</label><label>Distrito <select value={filters.district} onChange={(event) => setFilter("district", event.target.value)}><option value="">Todos</option>{[...geoOptions.districts].sort().map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Concelho <select value={filters.concelho} onChange={(event) => setFilter("concelho", event.target.value)}><option value="">Todos</option>{[...geoOptions.concelhos].sort().map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Freguesia <select value={filters.freguesia} onChange={(event) => setFilter("freguesia", event.target.value)}><option value="">Todos</option>{[...geoOptions.freguesias].sort().map((value) => <option key={value} value={value}>{value}</option>)}</select></label></Card>{error ? <p>Falha ao carregar anúncios: {error.message}</p> : <Table columns={columns} rows={filteredLeads} emptyMessage="Sem anúncios Imovirtual." />}</section>;
}
