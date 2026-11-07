const {
  getAuthorizedEmpresaIds,
  resolveCandidateUrl,
  buildLocationUpdatePayload,
  classifyFetchOutcome,
  isInvalidLocation,
  hasInvalidLocationFields,
  buildInvalidLocationFilter,
  resolveBatchSize,
  applyAfterIdFilter,
  extractLocationFromHtml,
  fetchListing,
  processRepairCandidates
} = require('./index.ts');

const AD_URL = 'https://www.imovirtual.com/pt/anuncio/apartamento-t2-porto-IDabc123.html';

function htmlWithNextData(nextData) {
  return `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></head><body></body></html>`;
}

function htmlWithJsonLd(jsonLd) {
  return `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body></body></html>`;
}

function emptyLocationRow(overrides = {}) {
  return {
    id: 'row-1',
    external_id: 'IDabc123',
    url: AD_URL,
    location: '',
    city: '',
    district: '',
    freguesia: '',
    concelho: '',
    raw_data: {},
    ...overrides
  };
}

describe('repair-imovirtual-location authorization and payload guards', () => {
  it('allows only admin-scoped empresas and rejects arbitrary empresa ids', () => {
    const roles = [
      { empresa_id: 'empresa-a', roles: { code: 'ADMIN' } },
      { empresa_id: 'empresa-b', roles: { code: 'ADMIN' } },
      { empresa_id: 'empresa-c', roles: { code: 'USER' } }
    ];

    expect(getAuthorizedEmpresaIds({ roles })).toEqual(['empresa-a', 'empresa-b']);
    expect(getAuthorizedEmpresaIds({ roles, requestedEmpresaId: 'empresa-a' })).toEqual(['empresa-a']);
    expect(getAuthorizedEmpresaIds({ roles, requestedEmpresaId: 'empresa-c' })).toEqual([]);
  });

  it('resolves only persisted URLs and never invents one from external_id alone', () => {
    expect(resolveCandidateUrl({
      url: 'https://www.imovirtual.com/pt/anuncio/apartamento-t2-ID123',
      raw_data: {}
    })).toBe('https://www.imovirtual.com/pt/anuncio/apartamento-t2-ID123');

    expect(resolveCandidateUrl({
      raw_data: { href: 'https://www.imovirtual.com/pt/anuncio/apartamento-t2-ID123' }
    })).toBe('https://www.imovirtual.com/pt/anuncio/apartamento-t2-ID123');

    expect(resolveCandidateUrl({
      external_id: 'ID123',
      raw_data: {}
    })).toBeNull();
  });

  it('classifies 404 and 410 HTTP failures separately from not-found or missing data', () => {
    expect(classifyFetchOutcome({ ok: false, category: 'http_error', status: 404 })).toBe('http_error');
    expect(classifyFetchOutcome({ ok: false, category: 'http_error', status: 410 })).toBe('http_error');
    expect(classifyFetchOutcome({ ok: false, category: 'location_not_found' })).toBe('location_not_found');
    expect(classifyFetchOutcome({ ok: false, category: 'missing_url' })).toBe('missing_url');
  });

  it('preserves valid values and fills only invalid location fields', () => {
    const row = {
      city: '',
      district: 'Porto',
      location: '',
      freguesia: '',
      concelho: '',
      raw_data: {
        city: 'Porto',
        district: 'Porto',
        municipality: 'Porto',
        freguesia: 'Porto',
        location: { city: 'Porto', district: 'Porto' }
      }
    };

    const payload = buildLocationUpdatePayload(row, {
      city: 'Vila Nova de Gaia',
      district: 'Porto',
      municipality: 'Vila Nova de Gaia',
      freguesia: 'Santa Marinha',
      source: 'next_data'
    }, '2026-10-26T00:00:00.000Z');

    expect(payload.city).toBe('Vila Nova de Gaia');
    expect(payload.district).toBeUndefined();
    expect(payload.location).toBe('Vila Nova de Gaia, Porto');
    expect(payload.freguesia).toBe('Santa Marinha');
    expect(payload.concelho).toBe('Vila Nova de Gaia');
    expect(payload.updated_at).toBe('2026-10-26T00:00:00.000Z');
    expect(payload.raw_data.repair.imovirtualLocation).toEqual({
      repairedAt: '2026-10-26T00:00:00.000Z',
      source: 'next_data'
    });
  });

  it('does not overwrite valid location values with empty or invalid data', () => {
    const row = {
      city: 'Faro',
      district: 'Faro',
      location: 'Faro, Faro',
      freguesia: 'Sé',
      concelho: 'Faro',
      raw_data: {}
    };

    const payload = buildLocationUpdatePayload(row, {
      city: '',
      district: '',
      municipality: '',
      freguesia: '',
      source: 'next_data'
    }, '2026-10-26T00:00:00.000Z');

    expect(payload.city).toBeUndefined();
    expect(payload.district).toBeUndefined();
    expect(payload.location).toBeUndefined();
    expect(payload.freguesia).toBeUndefined();
    expect(payload.concelho).toBeUndefined();
  });
});

describe('repair-imovirtual-location location extraction', () => {
  it('extracts a complete location from a normal location.address structure', () => {
    const html = htmlWithNextData({
      props: {
        pageProps: {
          ad: {
            id: 'IDabc123',
            href: '/pt/anuncio/apartamento-t2-porto-IDabc123.html',
            location: {
              address: {
                province: { name: 'Porto' },
                municipality: { name: 'Vila Nova de Gaia' },
                county: { name: 'Vila Nova de Gaia' },
                city: { name: 'São Pedro da Afurada' },
                parish: { name: 'Santa Marinha e São Pedro da Afurada' }
              }
            }
          }
        }
      }
    });

    expect(extractLocationFromHtml(html, 'IDabc123', AD_URL)).toEqual({
      ok: true,
      source: 'next_data',
      location: {
        city: 'São Pedro da Afurada',
        district: 'Porto',
        municipality: 'Vila Nova de Gaia',
        freguesia: 'Santa Marinha e São Pedro da Afurada'
      }
    });
  });

  it('extracts location from reverseGeocoding.locations when address fields are empty', () => {
    const html = htmlWithNextData({
      props: {
        pageProps: {
          ad: {
            id: 'IDabc123',
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
          }
        }
      }
    });

    expect(extractLocationFromHtml(html, 'IDabc123', AD_URL)).toEqual({
      ok: true,
      source: 'next_data',
      location: {
        city: null,
        district: 'Porto',
        municipality: 'Vila Nova de Gaia',
        freguesia: 'Santa Marinha e São Pedro da Afurada'
      }
    });
  });

  it('matches the correct ad by external_id among multiple ads in __NEXT_DATA__', () => {
    const html = htmlWithNextData({
      props: {
        pageProps: {
          ad: {
            id: 'IDmain999',
            location: { address: { city: { name: 'Lisboa' }, province: { name: 'Lisboa' } } }
          },
          similarAds: [
            {
              id: 'IDabc123',
              location: {
                address: {
                  city: { name: 'Porto' },
                  province: { name: 'Porto' },
                  county: { name: 'Porto' },
                  parish: { name: 'Cedofeita' }
                }
              }
            }
          ]
        }
      }
    });

    const result = extractLocationFromHtml(html, 'IDabc123', AD_URL);
    expect(result.ok).toBe(true);
    expect(result.location).toEqual({
      city: 'Porto',
      district: 'Porto',
      municipality: 'Porto',
      freguesia: 'Cedofeita'
    });
  });

  it('rejects extraction when no ad matches the external_id, without returning another ad location', () => {
    const html = htmlWithNextData({
      props: {
        pageProps: {
          ad: {
            id: 'IDother999',
            location: { address: { city: { name: 'Lisboa' }, province: { name: 'Lisboa' } } }
          }
        }
      }
    });

    const result = extractLocationFromHtml(html, 'IDabc123', AD_URL);
    expect(result.ok).toBe(false);
    expect(result.category).toBe('location_not_found');
    expect(result.location).toBeUndefined();
  });

  it('rejects JSON-LD location without unequivocal association to the ad', () => {
    const html = htmlWithJsonLd({
      '@type': 'Residence',
      address: { addressLocality: 'Porto', addressRegion: 'Porto' }
    });

    const result = extractLocationFromHtml(html, 'IDabc123', AD_URL);
    expect(result.ok).toBe(false);
    expect(result.category).toBe('location_not_found');
  });

  it('accepts JSON-LD location when the object identity matches the external_id or page URL', () => {
    const byUrl = extractLocationFromHtml(htmlWithJsonLd({
      '@type': 'RealEstateListing',
      url: AD_URL,
      address: { addressLocality: 'Porto', addressRegion: 'Porto', addressCounty: 'Porto' }
    }), 'IDabc123', AD_URL);
    expect(byUrl).toEqual({
      ok: true,
      source: 'json_ld',
      location: { city: 'Porto', district: 'Porto', municipality: 'Porto', freguesia: null }
    });

    const byGraphId = extractLocationFromHtml(htmlWithJsonLd({
      '@graph': [
        { '@type': 'BreadcrumbList' },
        {
          '@type': 'RealEstateListing',
          '@id': 'https://www.imovirtual.com/pt/anuncio/apartamento-t2-porto-IDabc123.html',
          address: { addressLocality: 'Gaia', addressRegion: 'Porto' }
        }
      ]
    }), 'IDabc123', AD_URL);
    expect(byGraphId).toEqual({
      ok: true,
      source: 'json_ld',
      location: { city: 'Gaia', district: 'Porto', municipality: null, freguesia: null }
    });
  });

  it('recovers partial location when only some levels are available', () => {
    const html = htmlWithNextData({
      props: {
        pageProps: {
          ad: { id: 'IDabc123', province: 'Porto' }
        }
      }
    });

    expect(extractLocationFromHtml(html, 'IDabc123', AD_URL)).toEqual({
      ok: true,
      source: 'next_data',
      location: { city: null, district: 'Porto', municipality: null, freguesia: null }
    });
  });
});

describe('repair-imovirtual-location candidate selection', () => {
  it('treats empty and N/A values as invalid and keeps valid values eligible', () => {
    expect(isInvalidLocation('')).toBe(true);
    expect(isInvalidLocation('  ')).toBe(true);
    expect(isInvalidLocation('N/A')).toBe(true);
    expect(isInvalidLocation('n/a')).toBe(true);
    expect(isInvalidLocation(null)).toBe(true);
    expect(isInvalidLocation('Porto')).toBe(false);
  });

  it('includes concelho and freguesia in the invalid-field selection', () => {
    const validRow = { location: 'Porto', city: 'Porto', district: 'Porto', freguesia: 'Sé', concelho: 'Porto' };
    expect(hasInvalidLocationFields(validRow)).toBe(false);
    expect(hasInvalidLocationFields({ ...validRow, freguesia: '' })).toBe(true);
    expect(hasInvalidLocationFields({ ...validRow, freguesia: 'N/A' })).toBe(true);
    expect(hasInvalidLocationFields({ ...validRow, concelho: '' })).toBe(true);
    expect(hasInvalidLocationFields({ ...validRow, concelho: 'n/a' })).toBe(true);
  });

  it('builds a PostgREST or-filter covering location, city, district, freguesia and concelho', () => {
    const filter = buildInvalidLocationFilter();
    for (const column of ['location', 'city', 'district', 'freguesia', 'concelho']) {
      expect(filter).toContain(`${column}.is.null`);
      expect(filter).toContain(`${column}.eq.`);
      expect(filter).toContain(`${column}.ilike.n/a`);
    }
  });

  it('paginates by afterId and clamps batchSize to the configured limits', () => {
    const query = { gt: jest.fn(() => query) };
    expect(applyAfterIdFilter(query, 'lead-42')).toBe(query);
    expect(query.gt).toHaveBeenCalledWith('id', 'lead-42');

    const queryWithoutAfter = { gt: jest.fn(() => queryWithoutAfter) };
    applyAfterIdFilter(queryWithoutAfter, '');
    expect(queryWithoutAfter.gt).not.toHaveBeenCalled();

    expect(resolveBatchSize(undefined)).toBe(50);
    expect(resolveBatchSize(10)).toBe(10);
    expect(resolveBatchSize(500)).toBe(100);
    expect(resolveBatchSize(-5)).toBe(1);
  });
});

describe('repair-imovirtual-location fetchListing', () => {
  it('classifies HTTP errors without invoking extraction', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 404 }));
    const result = await fetchListing(AD_URL, 'IDabc123', { fetchImpl });

    expect(result).toMatchObject({ ok: false, category: 'http_error', status: 404 });
  });

  it('aborts slow responses and classifies them as extraction failures', async () => {
    const fetchImpl = jest.fn((url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('The operation was aborted.')));
    }));

    const result = await fetchListing(AD_URL, 'IDabc123', { fetchImpl, timeoutMs: 5 });
    expect(result.ok).toBe(false);
    expect(result.category).toBe('extraction_failed');
  });

  it('rejects empty or invalid responses', async () => {
    const emptyFetch = jest.fn(async () => ({ ok: true, text: async () => '' }));
    expect(await fetchListing(AD_URL, 'IDabc123', { fetchImpl: emptyFetch }))
      .toMatchObject({ ok: false, category: 'invalid_response' });

    const noDataFetch = jest.fn(async () => ({ ok: true, text: async () => '<html><body>sem dados</body></html>' }));
    expect(await fetchListing(AD_URL, 'IDabc123', { fetchImpl: noDataFetch }))
      .toMatchObject({ ok: false, category: 'location_not_found' });
  });

  it('refuses non-HTTPS URLs without calling fetch', async () => {
    const fetchImpl = jest.fn();
    const result = await fetchListing('http://www.imovirtual.com/pt/anuncio/x-IDabc123.html', 'IDabc123', { fetchImpl });

    expect(result).toMatchObject({ ok: false, category: 'invalid_url' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('extracts location end-to-end from a fetched page', async () => {
    const html = htmlWithNextData({
      props: {
        pageProps: {
          ad: {
            id: 'IDabc123',
            location: { address: { city: { name: 'Porto' }, province: { name: 'Porto' } } }
          }
        }
      }
    });
    const fetchImpl = jest.fn(async () => ({ ok: true, text: async () => html }));

    const result = await fetchListing(AD_URL, 'IDabc123', { fetchImpl });
    expect(result).toEqual({
      ok: true,
      source: 'next_data',
      location: { city: 'Porto', district: 'Porto', municipality: null, freguesia: null }
    });
    expect(fetchImpl).toHaveBeenCalledWith(AD_URL, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
});

describe('repair-imovirtual-location result accounting', () => {
  function buildFetchLocation(locationsByExternalId) {
    return jest.fn(async (url, externalId) => locationsByExternalId[externalId]);
  }

  it('distinguishes updated, partial, not-found, http errors, update errors and missing data', async () => {
    const rows = [
      emptyLocationRow({ id: 'r1', external_id: 'E1' }),
      emptyLocationRow({ id: 'r2', external_id: 'E2' }),
      emptyLocationRow({ id: 'r3', external_id: 'E3' }),
      emptyLocationRow({ id: 'r4', external_id: 'E4' }),
      emptyLocationRow({ id: 'r5', external_id: 'E5' }),
      emptyLocationRow({
        id: 'r6',
        external_id: 'E6',
        district: 'Porto',
        location: 'Porto',
        freguesia: 'Sé',
        concelho: 'Porto'
      }),
      emptyLocationRow({ id: 'r7', external_id: '' })
    ];

    const fetchLocation = buildFetchLocation({
      E1: { ok: true, source: 'next_data', location: { city: 'Porto', district: 'Porto', municipality: 'Porto', freguesia: 'Sé' } },
      E2: { ok: true, source: 'next_data', location: { city: null, district: 'Porto', municipality: null, freguesia: null } },
      E3: { ok: false, category: 'location_not_found', error: 'Localizacao nao encontrada no anuncio.' },
      E4: { ok: false, category: 'http_error', status: 410, error: 'HTTP 410' },
      E5: { ok: true, source: 'next_data', location: { city: 'Porto', district: 'Porto', municipality: 'Porto', freguesia: 'Sé' } },
      E6: { ok: true, source: 'next_data', location: { city: null, district: 'Porto', municipality: 'Porto', freguesia: null } }
    });
    const updateRow = jest.fn(async (row) => (row.id === 'r5' ? 'duplicate key value' : null));

    const result = await processRepairCandidates(rows, { fetchLocation, updateRow });

    expect(result.fetched).toBe(7);
    expect(result.updated).toBe(1);
    expect(result.partial).toBe(1);
    expect(result.notFound).toBe(2);
    expect(result.httpErrors).toBe(1);
    expect(result.updateErrors).toBe(1);
    expect(result.locationErrors).toBe(1);
    expect(result.extractionErrors).toBe(0);
    expect(
      result.updated + result.partial + result.notFound +
      result.httpErrors + result.extractionErrors + result.locationErrors + result.updateErrors
    ).toBe(result.fetched);

    expect(updateRow).toHaveBeenCalledTimes(3);
    expect(updateRow.mock.calls.map(([row]) => row.id).sort()).toEqual(['r1', 'r2', 'r5']);
    expect(result.errors.map((entry) => entry.category).sort()).toEqual([
      'http_error',
      'location_not_found',
      'location_not_found',
      'missing_url',
      'update_failed'
    ]);
  });

  it('does not count a row as repaired when no invalid field was effectively corrected', async () => {
    const row = emptyLocationRow({
      id: 'r8',
      external_id: 'E8',
      district: 'Porto',
      location: 'Porto',
      freguesia: 'Sé',
      concelho: 'Porto'
    });

    const fetchLocation = buildFetchLocation({
      E8: { ok: true, source: 'next_data', location: { city: null, district: 'Porto', municipality: 'Porto', freguesia: null } }
    });
    const updateRow = jest.fn(async () => null);

    const result = await processRepairCandidates([row], { fetchLocation, updateRow });

    expect(result.updated).toBe(0);
    expect(result.partial).toBe(0);
    expect(result.notFound).toBe(1);
    expect(updateRow).not.toHaveBeenCalled();
  });

  it('persists only invalid fields and preserves the valid ones', async () => {
    const row = emptyLocationRow({
      id: 'r9',
      external_id: 'E9',
      city: 'Faro',
      location: 'Faro',
      freguesia: 'Sé',
      concelho: 'Faro'
    });

    const fetchLocation = buildFetchLocation({
      E9: { ok: true, source: 'next_data', location: { city: 'Porto', district: 'Porto', municipality: 'Porto', freguesia: 'Cedofeita' } }
    });
    const updateRow = jest.fn(async () => null);

    const result = await processRepairCandidates([row], { fetchLocation, updateRow });

    expect(result.updated).toBe(1);
    expect(updateRow).toHaveBeenCalledTimes(1);
    const payload = updateRow.mock.calls[0][1];
    expect(payload.district).toBe('Porto');
    expect(payload.city).toBeUndefined();
    expect(payload.location).toBeUndefined();
    expect(payload.freguesia).toBeUndefined();
    expect(payload.concelho).toBeUndefined();
    expect(payload.raw_data.repair.imovirtualLocation.source).toBe('next_data');
  });
});
