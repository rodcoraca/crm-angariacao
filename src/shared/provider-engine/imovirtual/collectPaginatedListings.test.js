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

  const makeFetchPage = (pages) => async (page) => ({
    html: `<script id="__NEXT_DATA__">${JSON.stringify(pages[page - 1] || makePage([]))}</script>`,
    fetchedAt: new Date().toISOString()
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
});
