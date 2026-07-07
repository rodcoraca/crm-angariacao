const RADAR_META_BLOCK_HEADER = "[RADAR_METADATA]";

function toText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toIso(value, fallback = null) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function buildRadarLeadMetadata(raw = {}) {
  const provider = toText(raw.provider || raw.origem, "Radar");
  const publisherContact = toText(
    raw.publisherContact || raw.contacto_anunciante || raw.contacto?.telefone || raw.contacto?.email,
    ""
  );

  return {
    provider,
    externalId: toText(raw.externalId || raw.id_externo || raw.id, ""),
    url: toText(raw.url || raw.url_original, ""),
    publisherName: toText(raw.publisherName || raw.anunciante_nome, ""),
    publisherContact,
    publishedAt: toIso(raw.publishedAt || raw.data_publicacao || raw.publicado_em, null),
    capturedAt: toIso(raw.capturedAt || raw.data_recolha || raw.encontrado_em, new Date().toISOString()),
    score: toNumber(raw.score, 0),
    status: toText(raw.status || raw.estado, "novo")
  };
}

export function serializeRadarLeadMetadataBlock(metadataInput = {}) {
  const metadata = buildRadarLeadMetadata(metadataInput);

  const lines = [
    RADAR_META_BLOCK_HEADER,
    "Origem: Radar",
    `Portal: ${metadata.provider || "-"}`,
    `ID Externo: ${metadata.externalId || "-"}`,
    `Anunciante: ${metadata.publisherName || "-"}`,
    `Contacto: ${metadata.publisherContact || "-"}`,
    `Publicado em: ${formatDate(metadata.publishedAt)}`,
    `Recolhido em: ${formatDate(metadata.capturedAt)}`,
    `Score Radar: ${metadata.score}`,
    `Estado Radar: ${metadata.status || "-"}`,
    "URL:",
    metadata.url || "-"
  ];

  return lines.join("\n");
}

export function appendRadarMetadataBlockOnce(existingObservation, metadataInput = {}) {
  const current = toText(existingObservation, "");

  if (current.includes(RADAR_META_BLOCK_HEADER) || current.includes("Origem: Radar")) {
    return current;
  }

  const block = serializeRadarLeadMetadataBlock(metadataInput);
  if (!current) return block;

  return `${current}\n\n${block}`;
}

export function parseRadarLeadMetadataFromObservation(observation) {
  const text = toText(observation, "");
  if (!text) return null;
  if (!text.includes(RADAR_META_BLOCK_HEADER) && !text.includes("Origem: Radar")) return null;

  const lines = text.split(/\r?\n/).map((line) => line.trim());

  function findValue(label) {
    const line = lines.find((item) => item.startsWith(`${label}:`));
    if (!line) return "";
    return line.slice(label.length + 1).trim();
  }

  const urlIndex = lines.findIndex((line) => line === "URL:");
  const urlValue = urlIndex >= 0 ? toText(lines[urlIndex + 1], "") : "";

  const metadata = buildRadarLeadMetadata({
    provider: findValue("Portal"),
    externalId: findValue("ID Externo"),
    publisherName: findValue("Anunciante"),
    publisherContact: findValue("Contacto"),
    publishedAt: findValue("Publicado em"),
    capturedAt: findValue("Recolhido em"),
    score: findValue("Score Radar"),
    status: findValue("Estado Radar"),
    url: urlValue
  });

  return metadata;
}
