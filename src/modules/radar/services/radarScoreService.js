function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function daysBetween(referenceDate, targetDate) {
  const start = new Date(referenceDate);
  const end = new Date(targetDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 999;
  }

  const deltaMs = start.getTime() - end.getTime();
  return Math.max(0, Math.floor(deltaMs / (1000 * 60 * 60 * 24)));
}

function scoreByOpportunityAge(opportunity, now) {
  const originDate = opportunity?.encontrado_em || opportunity?.publicado_em || null;
  const ageDays = daysBetween(now, originDate);

  if (ageDays <= 1) return 30;
  if (ageDays <= 3) return 24;
  if (ageDays <= 7) return 18;
  if (ageDays <= 14) return 12;
  return 6;
}

function scoreByPrice(opportunity) {
  const tipo = String(opportunity?.tipo || "").toLowerCase();
  const preco = normalizeNumber(opportunity?.preco, 0);

  if (tipo === "apartamento") {
    if (preco >= 180000 && preco <= 420000) return 25;
    if (preco >= 140000 && preco <= 520000) return 18;
    return 10;
  }

  if (tipo === "moradia") {
    if (preco >= 250000 && preco <= 650000) return 25;
    if (preco >= 200000 && preco <= 780000) return 18;
    return 10;
  }

  if (tipo === "comercial") {
    if (preco >= 120000 && preco <= 380000) return 25;
    if (preco >= 90000 && preco <= 520000) return 18;
    return 10;
  }

  if (preco >= 120000 && preco <= 500000) return 18;
  return 10;
}

function scoreByPropertyType(opportunity) {
  const tipo = String(opportunity?.tipo || "").toLowerCase();

  if (tipo === "apartamento") return 18;
  if (tipo === "moradia") return 16;
  if (tipo === "comercial") return 14;
  return 12;
}

function scoreByOperationalState(opportunity) {
  const estado = String(opportunity?.estado || "").toLowerCase();

  if (estado === "novo") return 20;
  if (estado === "analisado") return 14;
  if (estado === "importado") return 10;
  if (estado === "ignorado") return 0;
  return 8;
}

export function calcularScoreInteligente(opportunity, options = {}) {
  const now = options.now || new Date();

  const ageScore = scoreByOpportunityAge(opportunity, now);
  const priceScore = scoreByPrice(opportunity);
  const typeScore = scoreByPropertyType(opportunity);
  const stateScore = scoreByOperationalState(opportunity);

  const total = ageScore + priceScore + typeScore + stateScore;
  return clamp(Math.round(total), 0, 100);
}

export function recalcularOpportunityScore(opportunity, options = {}) {
  return {
    ...opportunity,
    score: calcularScoreInteligente(opportunity, options)
  };
}
