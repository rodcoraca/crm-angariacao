function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreByPublishedAt(opportunity, now) {
  const publishedAtRaw = opportunity?.created_at_first;
  const publishedAt = new Date(publishedAtRaw);

  if (!publishedAtRaw || Number.isNaN(publishedAt.getTime())) {
    return 0;
  }

  const deltaMs = now.getTime() - publishedAt.getTime();
  if (deltaMs < 0) return 0;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  if (deltaMs < oneDayMs) return 25;
  if (deltaMs >= oneDayMs && deltaMs <= sevenDaysMs) return 15;
  return 0;
}

export function calcularScoreInteligente(opportunity, options = {}) {
  const now = options.now || new Date();
  let total = 0;

  if (opportunity?.is_private_owner === true) {
    total += 50;
  } else {
    total -= 20;
  }

  total += scoreByPublishedAt(opportunity, now);

  if (String(opportunity?.distrito || "").trim().toLowerCase() === "porto") {
    total += 15;
  }

  if (String(opportunity?.owner_name || "").trim()) {
    total += 10;
  }

  return clamp(Math.round(total), 0, 100);
}

export function recalcularOpportunityScore(opportunity, options = {}) {
  return {
    ...opportunity,
    score: calcularScoreInteligente(opportunity, options)
  };
}
