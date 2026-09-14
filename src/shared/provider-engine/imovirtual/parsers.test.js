import { mapNextDataItemToListing } from './parsers';

describe('Imovirtual createdAtFirst normalization', () => {
  const baseItem = {
    id: 'imovirtual-1',
    href: '/pt/anuncio/imovirtual-1',
    title: 'Apartamento'
  };

  it('converts a summer Portugal local timestamp to UTC', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      createdAtFirst: '2026-09-08T11:00:08Z'
    }).createdAtFirst).toBe('2026-09-08T10:00:08.000Z');
  });

  it('keeps a winter Portugal local timestamp aligned with UTC', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      createdAtFirst: '2026-01-08T11:00:08Z'
    }).createdAtFirst).toBe('2026-01-08T11:00:08.000Z');
  });

  it('returns null for missing or invalid timestamps', () => {
    expect(mapNextDataItemToListing({ ...baseItem, createdAtFirst: null }).createdAtFirst).toBeNull();
    expect(mapNextDataItemToListing({ ...baseItem, createdAtFirst: 'invalid' }).createdAtFirst).toBeNull();
  });
});
