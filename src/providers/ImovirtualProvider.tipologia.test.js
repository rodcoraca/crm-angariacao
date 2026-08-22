import { extractTipologiaFromDetailHtml } from './ImovirtualProvider.js';

describe('extractTipologiaFromDetailHtml', () => {
  it('extracts T1 from the validated real Imovirtual detail HTML', () => {
    const html = `
      <html>
        <body>
          <div>Tipologia: T1</div>
          <div>Descrição: Apartamento tipologia T1 (L) Novo pronto a Habitar com varanda e acabamentos de alta qualidade.</div>
        </body>
      </html>
    `;

    expect(extractTipologiaFromDetailHtml(html)).toBe('T1');
  });

  it('keeps tipologia inside raw_data without exposing it at the top level payload', () => {
    const listing = {
      externalId: '19245464',
      title: 'Apartamento T1',
      price: 250000,
      rooms: 1,
      city: 'Porto',
      district: 'Valadares'
    };

    const extractedTipologia = extractTipologiaFromDetailHtml('<div>Tipologia: T1</div>');
    const payload = {
      provider: 'imovirtual',
      external_id: listing.externalId,
      title: listing.title,
      price: listing.price,
      rooms: listing.rooms,
      city: listing.city,
      district: listing.district,
      raw_data: { ...listing, tipologia: extractedTipologia }
    };

    expect(payload.tipologia).toBeUndefined();
    expect(payload.raw_data.tipologia).toBe('T1');
    expect(payload.raw_data.title).toBe('Apartamento T1');
    expect(payload.raw_data.rooms).toBe(1);
    expect(payload.raw_data.city).toBe('Porto');
    expect(payload.raw_data.district).toBe('Valadares');
  });

  it('returns null when the label is missing or the value is not a valid tipologia', () => {
    const html = '<html><body><div>Categoria: Apartamento</div></body></html>';
    expect(extractTipologiaFromDetailHtml(html)).toBeNull();
  });
});
