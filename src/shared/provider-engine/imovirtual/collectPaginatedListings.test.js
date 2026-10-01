import { collectImovirtualPaginatedListings } from './collectPaginatedListings.js';

describe('collectImovirtualPaginatedListings', () => {
  const makePage = (items) => ({
    props: {
      pageProps: {
        data: {
          searchAds: { items }
        }
      }
    }
  });

  const makeFetchPage = (pages, fetchedAtByPage = {}) => async (page) => ({
    html: `<script id="__NEXT_DATA__">${JSON.stringify(pages[page - 1] || makePage([]))}</script>`,
    fetchedAt: fetchedAtByPage[page] || new Date().toISOString()
  });

  it('associa detectedAt ao fetchedAt da página e preserva fetchedAt global', async () => {
    const pageOneFetchedAt = '2026-09-17T10:00:00.000Z';
    const pageTwoFetchedAt = '2026-09-17T10:00:01.000Z';
    const result = await collectImovirtualPaginatedListings({
      maxPages: 2,
      fetchPage: makeFetchPage([
        makePage([{ id: 'page-1', href: '/pt/anuncio/page-1', createdAtFirst: '2026-09-17T09:00:00.000Z' }]),
        makePage([{ id: 'page-2', href: '/pt/anuncio/page-2', createdAtFirst: '2026-09-17T08:00:00.000Z' }])
      ], {
        1: pageOneFetchedAt,
        2: pageTwoFetchedAt
      })
    });

    expect(result.fetchedAt).toBe(pageOneFetchedAt);
    expect(result.listings.map((listing) => listing.detectedAt)).toEqual([
      pageOneFetchedAt,
      pageTwoFetchedAt
    ]);
  });

  it('A) página 1 totalmente posterior ao checkpoint continua', async () => {
    const checkpoint = new Date('2026-08-10T00:00:00.000Z').getTime();
    const pages = [
      makePage([
        { id: '101', href: '/pt/anuncio/101', createdAtFirst: '2026-08-11T09:00:00.000Z' },
        { id: '102', href: '/pt/anuncio/102', createdAtFirst: '2026-08-11T08:00:00.000Z' }
      ]),
      makePage([
        { id: '103', href: '/pt/anuncio/103', createdAtFirst: '2026-08-09T09:00:00.000Z' },
        { id: '104', href: '/pt/anuncio/104', createdAtFirst: '2026-08-08T09:00:00.000Z' }
      ])
    ];

    const result = await collectImovirtualPaginatedListings({
      maxPages: 5,
      checkpoint,
      fetchPage: makeFetchPage(pages)
    });

    expect(result.listings).toHaveLength(2);
    expect(result.pagesProcessed).toBe(2);
    expect(result.stopReason).toBe('checkpoint_reached');
  });

  it('B) página seguinte com posteriores e anteriores mantém apenas os posteriores e para', async () => {
    const checkpoint = new Date('2026-08-10T00:00:00.000Z').getTime();
    const pages = [
      makePage([
        { id: '201', href: '/pt/anuncio/201', createdAtFirst: '2026-08-11T09:00:00.000Z' }
      ]),
      makePage([
        { id: '202', href: '/pt/anuncio/202', createdAtFirst: '2026-08-11T10:00:00.000Z' },
        { id: '203', href: '/pt/anuncio/203', createdAtFirst: '2026-08-09T09:00:00.000Z' }
      ])
    ];

    const result = await collectImovirtualPaginatedListings({
      maxPages: 5,
      checkpoint,
      fetchPage: makeFetchPage(pages)
    });

    expect(result.listings).toHaveLength(2);
    expect(result.listings.map((item) => item.externalId || item.id)).toEqual(['201', '202']);
    expect(result.stopReason).toBe('checkpoint_reached');
  });

  it('C) página totalmente anterior ao checkpoint não adiciona anúncios e para', async () => {
    const checkpoint = new Date('2026-08-10T00:00:00.000Z').getTime();
    const pages = [
      makePage([
        { id: '301', href: '/pt/anuncio/301', createdAtFirst: '2026-08-09T09:00:00.000Z' },
        { id: '302', href: '/pt/anuncio/302', createdAtFirst: '2026-08-08T09:00:00.000Z' }
      ])
    ];

    const result = await collectImovirtualPaginatedListings({
      maxPages: 5,
      checkpoint,
      fetchPage: makeFetchPage(pages)
    });

    expect(result.listings).toHaveLength(0);
    expect(result.pagesProcessed).toBe(1);
    expect(result.stopReason).toBe('checkpoint_reached');
  });

  it('D) checkpoint null preserva comportamento atual', async () => {
    const pages = [
      makePage([
        { id: '401', href: '/pt/anuncio/401', createdAtFirst: '2026-08-09T09:00:00.000Z' }
      ]),
      makePage([
        { id: '402', href: '/pt/anuncio/402', createdAtFirst: '2026-08-08T09:00:00.000Z' }
      ])
    ];

    const result = await collectImovirtualPaginatedListings({
      maxPages: 5,
      checkpoint: null,
      fetchPage: makeFetchPage(pages)
    });

    expect(result.listings).toHaveLength(2);
    expect(result.pagesProcessed).toBe(3);
    expect(result.stopReason).toBe('empty_page');
  });
  it('mapeia localização tanto no formato top-level como no formato nested', async () => {
    const { mapNextDataItemToListing } = await import('./parsers.js');

    expect(mapNextDataItemToListing({
      id: '501',
      href: '/pt/anuncio/501',
      province: 'Porto',
      county: 'Vila Nova de Gaia',
      city: 'Canidelo'
    })).toMatchObject({
      district: 'Porto',
      municipality: 'Vila Nova de Gaia',
      county: 'Vila Nova de Gaia',
      city: 'Canidelo',
      region: 'Porto',
      freguesia: null
    });

    expect(mapNextDataItemToListing({
      id: '502',
      href: '/pt/anuncio/502',
      location: {
        address: {
          province: { name: 'Porto' },
          county: { name: 'Matosinhos' },
          city: { name: 'Matosinhos e Leça da Palmeira' },
          parish: { name: 'Matosinhos' }
        }
      }
    })).toMatchObject({
      district: 'Porto',
      municipality: 'Matosinhos',
      county: 'Matosinhos',
      city: 'Matosinhos e Leça da Palmeira',
      region: 'Porto',
      freguesia: 'Matosinhos'
    });

    expect(mapNextDataItemToListing({
      id: '503',
      href: '/pt/anuncio/503',
      location: {
        address: {
          city: null,
          county: null,
          municipality: null,
          province: null
        },
        reverseGeocoding: {
          locations: [
            { locationLevel: 'district', name: 'Porto' },
            { locationLevel: 'council', name: 'Vila Nova de Gaia' },
            { locationLevel: 'parish', name: 'Santa Marinha e São Pedro da Afurada' },
            { locationLevel: 'neighborhood', name: 'Afurada - Arrábida - Cavaco' }
          ]
        }
      }
    })).toMatchObject({
      district: 'Porto',
      municipality: 'Vila Nova de Gaia',
      county: 'Vila Nova de Gaia',
      city: 'Vila Nova de Gaia',
      region: 'Porto',
      freguesia: 'Santa Marinha e São Pedro da Afurada'
    });
  });

});
