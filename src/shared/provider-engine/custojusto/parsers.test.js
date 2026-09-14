import { normalizeCustoJustoListing } from './parsers';

function listingWithListTime(listTime) {
  return normalizeCustoJustoListing({
    listID: '44946321',
    title: 'Apartamento',
    url: '/porto/imobiliario/apartamentos/44946321',
    listTime
  });
}

describe('CustoJusto listTime normalization', () => {
  it('treats a summer listTime as Europe/Lisbon local time before UTC normalization', () => {
    const listing = listingWithListTime('2026-09-08T11:00:08Z');

    expect(listing.createdAtFirst).toBe('2026-09-08T10:00:08.000Z');
    expect(listing.publishedAt).toBe('2026-09-08T10:00:08.000Z');
  });

  it('keeps winter local time aligned with UTC', () => {
    expect(listingWithListTime('2026-01-08T11:00:08Z').createdAtFirst)
      .toBe('2026-01-08T11:00:08.000Z');
  });

  it('applies the Lisbon summer offset to another summer example', () => {
    expect(listingWithListTime('2026-06-08T18:30:00Z').createdAtFirst)
      .toBe('2026-06-08T17:30:00.000Z');
  });

  it('returns null for publishedAt when listTime is absent or invalid', () => {
    expect(listingWithListTime(null).publishedAt).toBeNull();
    expect(listingWithListTime('invalid').publishedAt).toBeNull();
  });
});
