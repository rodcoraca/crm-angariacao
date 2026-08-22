function normalizeText(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTipologiaValue(html) {
  const text = normalizeText(html);
  const labelMatch = text.match(/Tipologia\s*:\s*/i);

  if (!labelMatch) {
    return { label: 'NOT_FOUND', value: 'NOT_FOUND', extracted: 'NOT_FOUND', status: 'NOT_FOUND' };
  }

  const afterLabel = text.slice(labelMatch.index + labelMatch[0].length);
  const valueMatch = afterLabel.match(/([TV](?:0|[1-9][0-9]*)(?:\+)?)/i);

  if (!valueMatch) {
    return { label: 'Tipologia:', value: 'NOT_FOUND', extracted: 'NOT_FOUND', status: 'NOT_FOUND' };
  }

  const extracted = valueMatch[1].toUpperCase();
  const valid = /^(?:T|V)(?:0|[1-9][0-9]*)(?:\+)?$/i.test(extracted);
  const status = valid && extracted === 'T3' ? 'FOUND' : 'INVALID';

  return {
    label: 'Tipologia:',
    value: extracted,
    extracted,
    status,
  };
}

const url = 'https://www.imovirtual.com/pt/anuncio/apartamento-t3-1-duplex-com-piscina-privativa-serpa-pinto-59-ID1iAlK';
const response = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
  }
});

const html = await response.text();
const result = extractTipologiaValue(html);

console.log('LABEL', result.label);
console.log('VALUE', result.value);
console.log('EXTRACTED', result.extracted);
console.log('STATUS', result.status);

if (result.status !== 'FOUND') {
  console.log('19205972 -> T3 -> NOT_FOUND');
  process.exit(1);
}

console.log('19205972 -> T3 -> FOUND');
process.exit(0);
