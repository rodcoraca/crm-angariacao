import {
  formatDateTime,
  formatPublishedDate,
  formatPublishedDateLabel,
  OLX_PROMOTION_REFERENCE_TOOLTIP
} from './radarUtils';

describe('Radar timestamp formatters', () => {
  const utcTimestamp = '2026-09-08T11:00:08.000Z';

  it('formats published timestamps in Europe/Lisbon', () => {
    expect(formatPublishedDate(utcTimestamp)).toBe('08/09/2026 12:00');
  });

  it('formats datetime timestamps in Europe/Lisbon', () => {
    expect(formatDateTime(utcTimestamp)).toBe('08/09/2026 12:00:08');
  });

  it('adds the visual marker only to OLX promotion references', () => {
    expect(formatPublishedDateLabel(utcTimestamp)).toBe('08/09/2026 12:00');
    expect(formatPublishedDateLabel(utcTimestamp, true)).toBe('08/09/2026 12:00*');
    expect(formatPublishedDateLabel(null, true)).toBe('—');
    expect(OLX_PROMOTION_REFERENCE_TOOLTIP).toContain("Para o topo");
  });
});
