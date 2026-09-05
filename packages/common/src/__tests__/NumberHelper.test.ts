import { NumberHelper, StringHelper } from 'repo-depkit-common';

describe('NumberHelper.toFixedNoRounding', () => {
  it('truncates fractional part without rounding', () => {
    expect(NumberHelper.toFixedNoRounding(123.4567, 2)).toBe('123.45');
  });

  it('pads fractional part with zeros when necessary', () => {
    expect(NumberHelper.toFixedNoRounding(12, 3)).toBe('12.000');
  });
});

describe('NumberHelper.formatNumber', () => {
  it('returns placeholder when value is null', () => {
    expect(NumberHelper.formatNumber(null, 'kg', true)).toBe(`?${StringHelper.NONBREAKING_HALF_SPACE}kg`);
  });

  it('formats number without rounding when roundUpOrDown is false', () => {
    expect(NumberHelper.formatNumber(12.3456, null, false, ',', null, 2)).toBe('12,34');
  });

  it('applies rounding, thousands separator and unit when requested', () => {
    const result = NumberHelper.formatNumber(1234.556, 'm', true, ',', '.', 2);
    expect(result).toBe(`1.234,56${StringHelper.NONBREAKING_HALF_SPACE}m`);
  });
});

describe('NumberHelper.insertThousandsSeparators', () => {
  // SonarCloud reliability rule (regex ReDoS): the previous implementation used the
  // `\B(?=(\d{3})+(?!\d))` lookahead regex, which SonarCloud flagged as having
  // super-linear runtime due to backtracking. It was replaced by a plain, regex-free
  // loop. These tests verify the replacement is both behaviorally equivalent and fast.
  it('groups digits in blocks of three from the right', () => {
    expect(NumberHelper.insertThousandsSeparators('1', ',')).toBe('1');
    expect(NumberHelper.insertThousandsSeparators('123', ',')).toBe('123');
    expect(NumberHelper.insertThousandsSeparators('1234', ',')).toBe('1,234');
    expect(NumberHelper.insertThousandsSeparators('1234567', ',')).toBe('1,234,567');
  });

  it('keeps a leading minus sign in front of the first digit group', () => {
    expect(NumberHelper.insertThousandsSeparators('-1234567', ',')).toBe('-1,234,567');
    expect(NumberHelper.insertThousandsSeparators('-123', ',')).toBe('-123');
  });

  it('supports arbitrary separator strings', () => {
    expect(NumberHelper.insertThousandsSeparators('1234567', '.')).toBe('1.234.567');
  });

  it('handles empty input without throwing', () => {
    expect(NumberHelper.insertThousandsSeparators('', ',')).toBe('');
  });

  it('stays fast (no super-linear backtracking) for very long digit strings', () => {
    const longDigits = '9'.repeat(200_000);
    const start = Date.now();
    const result = NumberHelper.insertThousandsSeparators(longDigits, ',');
    const durationMs = Date.now() - start;

    expect(result.replace(/,/g, '')).toBe(longDigits);
    expect(durationMs).toBeLessThan(500);
  });
});

describe('NumberHelper.formatCompact', () => {
  it('returns the number as string when below 1000', () => {
    expect(NumberHelper.formatCompact(0)).toBe('0');
    expect(NumberHelper.formatCompact(1)).toBe('1');
    expect(NumberHelper.formatCompact(999)).toBe('999');
  });

  it('formats thousands with k suffix', () => {
    expect(NumberHelper.formatCompact(1000)).toBe('1k');
    expect(NumberHelper.formatCompact(1500)).toBe('1.5k');
    expect(NumberHelper.formatCompact(9900)).toBe('9.9k');
    expect(NumberHelper.formatCompact(999999)).toBe('999.9k');
  });

  it('truncates instead of rounding for k', () => {
    expect(NumberHelper.formatCompact(1050)).toBe('1k');
    expect(NumberHelper.formatCompact(1990)).toBe('1.9k');
  });

  it('formats millions with m suffix', () => {
    expect(NumberHelper.formatCompact(1_000_000)).toBe('1m');
    expect(NumberHelper.formatCompact(1_500_000)).toBe('1.5m');
    expect(NumberHelper.formatCompact(9_900_000)).toBe('9.9m');
  });

  it('truncates instead of rounding for m', () => {
    expect(NumberHelper.formatCompact(1_050_000)).toBe('1m');
    expect(NumberHelper.formatCompact(1_990_000)).toBe('1.9m');
  });
});
