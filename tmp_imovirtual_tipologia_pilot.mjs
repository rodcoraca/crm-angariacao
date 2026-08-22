import { supabase } from './src/supabase.js';

function extractTipologiaFromDetailHtml(html) {
  if (typeof html !== 'string' || html.length === 0) return null;

  const normalizedHtml = html
    .replace(/&nbsp;/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedHtml) return null;

  const labelMatch = normalizedHtml.match(/Tipologia\s*[:\-]?\s*([TV](?:0|[1-9]\d*)(?:\+)?)/i);
  if (labelMatch) {
    const value = labelMatch[1].trim().toUpperCase();
    return /^(?:T|V)(?:0|[1-9]\d*)(?:\+)?$/.test(value) ? value : null;
  }

  const descriptionMatch = normalizedHtml.match(/(?:tipologia|tipologia comercial)\s*[:\-]?\s*([TV](?:0|[1-9]\d*)(?:\+)?)/i);
  if (descriptionMatch) {
    const value = descriptionMatch[1].trim().toUpperCase();
    return /^(?:T|V)(?:0|[1-9]\d*)(?:\+)?$/.test(value) ? value : null;
  }

  return null;
}

const { data: rows, error: selectErr } = await supabase
  .from('provider_leads')
  .select('id, external_id, title, raw_data')
  .eq('provider', 'imovirtual')
  .not('external_id', 'is', null)
  .limit(3);

if (selectErr) {
  console.error('SELECT_ERROR');
  console.error(JSON.stringify(selectErr, null, 2));
  process.exit(1);
}

console.log('RESULTADOS RECEBIDOS PELO CLIENTE SUPABASE (3):');
console.log(JSON.stringify(rows || [], null, 2));
process.exit(0);
