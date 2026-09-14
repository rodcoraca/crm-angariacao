import {
  removeRadarLeadMetadataFromObservation,
  resolveRadarLeadImportInfo
} from './radarLeadMetadata';

describe('resolveRadarLeadImportInfo', () => {
  it('detects and exposes imported lead metadata when the observation contains Radar metadata', () => {
    const observation = [
      '[RADAR_METADATA]',
      'Origem: Radar',
      'Portal: Imovirtual',
      'ID Externo: LIST-123',
      'Publicado em: 01/09/2026',
      'Recolhido em: 02/09/2026',
      'Score Radar: 88',
      'Estado Radar: ativo',
      'URL:',
      'https://example.com/imovel/123'
    ].join('\n');

    const result = resolveRadarLeadImportInfo({
      origem: 'Imovirtual',
      created_at: '2026-09-03T10:00:00.000Z',
      observacoes: observation
    }, {
      origem: 'Imovirtual',
      observacoes: observation
    });

    expect(result).not.toBeNull();
    expect(result.isRadarImported).toBe(true);
    expect(result.provider).toBe('Imovirtual');
    expect(result.externalId).toBe('LIST-123');
    expect(result.url).toBe('https://example.com/imovel/123');
    expect(result.importedAt).toBeTruthy();
    expect(result.status).toBe('✓ Importada pelo Radar');
  });

  it('returns null for normal leads without a Radar metadata block', () => {
    const result = resolveRadarLeadImportInfo({
      origem: 'Manual',
      observacoes: 'Sem metadata do Radar'
    }, {
      origem: 'Manual',
      observacoes: 'Sem metadata do Radar'
    });

    expect(result).toBeNull();
  });

  it('removes Radar metadata from the editable observations content', () => {
    const observation = 'Nota comercial\n\n[RADAR_METADATA]\nOrigem: Radar\nPortal: Imovirtual';

    expect(removeRadarLeadMetadataFromObservation(observation)).toBe('Nota comercial');
  });
});
