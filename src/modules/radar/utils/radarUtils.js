export function normalizeText(value, fallback) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

export function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "N/A";

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatPublishedDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  const datePart = date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const timePart = date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  return `${datePart} ${timePart}`;
}

export function calculateAverageScore(opportunities) {
  const values = (opportunities || [])
    .map((item) => Number(item?.score))
    .filter((score) => Number.isFinite(score));

  if (!values.length) return 0;

  const total = values.reduce((acc, score) => acc + score, 0);
  return Math.round(total / values.length);
}
