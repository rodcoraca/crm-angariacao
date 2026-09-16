import { mapNextDataItemToListing } from './parsers';

describe('Imovirtual publication date normalization', () => {
  const baseItem = {
    id: 'imovirtual-1',
    href: '/pt/anuncio/imovirtual-1',
    title: 'Apartamento'
  };

  it('preserves an absolute summer timestamp from Imovirtual', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      createdAtFirst: '2026-09-08T11:00:08Z'
    }).createdAtFirst).toBe('2026-09-08T11:00:08.000Z');
  });

  it('preserves an absolute winter timestamp from Imovirtual', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      createdAtFirst: '2026-01-08T11:00:08Z'
    }).createdAtFirst).toBe('2026-01-08T11:00:08.000Z');
  });

  it('extracts and normalizes publication dateCreated independently from createdAtFirst', () => {
    const listing = mapNextDataItemToListing({
      ...baseItem,
      dateCreated: '2026-07-08 15:07:38',
      createdAtFirst: '2026-05-25T11:40:54Z'
    });

    expect(listing.publishedAt).toBe('2026-07-08T14:07:38.000Z');
    expect(listing.createdAtFirst).toBe('2026-05-25T11:40:54.000Z');
    expect(listing.publishedAt).not.toBe(listing.createdAtFirst);
  });

  it('prefers publishedAt when the payload provides it directly', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      publishedAt: '2026-09-08T11:00:08Z',
      dateCreated: '2026-07-08 15:07:38'
    }).publishedAt).toBe('2026-09-08T11:00:08.000Z');
  });

  it('returns null for missing or invalid timestamps', () => {
    expect(mapNextDataItemToListing({ ...baseItem, createdAtFirst: null }).createdAtFirst).toBeNull();
    expect(mapNextDataItemToListing({ ...baseItem, createdAtFirst: 'invalid' }).createdAtFirst).toBeNull();
    expect(mapNextDataItemToListing({ ...baseItem }).publishedAt).toBeNull();
    expect(mapNextDataItemToListing({ ...baseItem, dateCreated: 'invalid' }).publishedAt).toBeNull();
  });
});
