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

  it('maps location fields provided at the top level', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      province: 'Porto',
      county: 'Vila Nova de Gaia',
      city: 'Canidelo'
    })).toMatchObject({
      district: 'Porto',
      municipality: 'Vila Nova de Gaia',
      county: 'Vila Nova de Gaia',
      city: 'Canidelo',
      region: 'Porto'
    });
  });

  it('extracts a complete location from location.address objects while preserving accents', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      location: {
        address: {
          province: { name: 'Porto' },
          municipality: { name: 'Vila Nova de Gaia' },
          county: { name: 'Vila Nova de Gaia' },
          city: { name: 'São Pedro da Afurada' },
          parish: { name: 'Santa Marinha e São Pedro da Afurada' }
        }
      }
    })).toMatchObject({
      district: 'Porto',
      municipality: 'Vila Nova de Gaia',
      county: 'Vila Nova de Gaia',
      city: 'São Pedro da Afurada',
      region: 'Porto',
      freguesia: 'Santa Marinha e São Pedro da Afurada'
    });
  });

  it('supports direct location fields and ignores malformed nested values', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      location: {
        municipality: { name: 'Matosinhos' },
        city: 'Leça da Palmeira',
        province: 'Porto',
        parish: null,
        address: {
          province: null,
          municipality: { name: 'Matosinhos' },
          city: { name: 'Leça da Palmeira' },
          county: { name: 'Matosinhos' },
          parish: null
        }
      }
    })).toMatchObject({
      district: 'Porto',
      municipality: 'Matosinhos',
      county: 'Matosinhos',
      city: 'Leça da Palmeira',
      region: 'Porto'
    });
  });

  it('falls back to reverseGeocoding when address fields are empty', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      location: {
        address: { city: null, county: null, municipality: null, province: null, parish: null },
        reverseGeocoding: {
          locations: [
            { locationLevel: 'district', name: 'Porto' },
            { locationLevel: 'council', name: 'Vila Nova de Gaia' },
            { locationLevel: 'parish', name: 'Santa Marinha e São Pedro da Afurada' }
          ]
        }
      }
    })).toMatchObject({
      district: 'Porto',
      municipality: 'Vila Nova de Gaia',
      county: 'Vila Nova de Gaia',
      city: null,
      region: 'Porto',
      freguesia: 'Santa Marinha e São Pedro da Afurada'
    });
  });

  it('keeps municipality available from municipality and concelho-only payloads', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      municipality: 'Albufeira',
      county: null,
      city: 'Albufeira'
    })).toMatchObject({
      municipality: 'Albufeira',
      county: 'Albufeira',
      city: 'Albufeira'
    });

    expect(mapNextDataItemToListing({
      ...baseItem,
      concelho: 'Amadora',
      district: 'Lisboa',
      city: 'Amadora'
    })).toMatchObject({
      municipality: 'Amadora',
      county: 'Amadora',
      city: 'Amadora',
      district: 'Lisboa'
    });
  });

  it('keeps valid values and ignores null or malformed data without replacing them', () => {
    expect(mapNextDataItemToListing({
      ...baseItem,
      district: 'Porto',
      municipality: null,
      county: undefined,
      city: 'Porto',
      location: {
        address: {
          municipality: { name: 'Porto' },
          city: null,
          province: 'Porto'
        }
      }
    })).toMatchObject({
      district: 'Porto',
      municipality: 'Porto',
      city: 'Porto'
    });
  });

});
