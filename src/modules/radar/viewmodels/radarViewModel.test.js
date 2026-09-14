import { RadarViewModel } from './radarViewModel';

describe('RadarViewModel status semantics', () => {
  it('distinguishes new, imported, active and inactive opportunities', () => {
    const rows = RadarViewModel.mapTable([
      { id: 'new', titulo: 'Nova', is_new: true, imported: false },
      { id: 'imported', titulo: 'Importada', is_new: true, imported: true },
      { id: 'active', titulo: 'Ativa', is_new: false, imported: false },
      { id: 'legacy-active', titulo: 'Ativa', estado: 'Ativa', is_new: false, imported: false },
      { id: 'inactive', titulo: 'Inativa', is_new: true, imported: false, is_inactive: true }
    ]);

    expect(rows.map((row) => row.estado)).toEqual([
      'Nova',
      'Importada',
      'Ativa',
      'Ativa',
      'Anúncio Inativo'
    ]);
  });

  it('preserves detected_at for the table renderer', () => {
    const detectedAt = '2026-09-08T10:07:08.916Z';
    const [row] = RadarViewModel.mapTable([
      { id: 'imported', titulo: 'Importada', imported: true, detected_at: detectedAt }
    ]);

    expect(row.rawOpportunity.detected_at).toBe(detectedAt);
  });

  it('presents OLX promotion references with an asterisk', () => {
    const [row] = RadarViewModel.mapTable([{
      id: 'olx-promotion',
      titulo: 'Apartamento',
      published_at: '2026-09-13T10:41:00.000Z',
      published_at_source: 'promotion'
    }]);

    expect(row.publicado).toBe('13/09/2026 11:41*');
  });

  it('does not count the technical lock owner marker as a provider error', () => {
    const flow = RadarViewModel.mapFlow([], {
      providerRegistry: [
        { last_error: '__lock_owner:owner-a' },
        { last_error: 'Falha real' }
      ]
    });

    expect(flow.find((item) => item.id === 'flow-erros').label).toContain('1');
  });
});
