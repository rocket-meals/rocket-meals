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
    expect(NumberHelper.formatNumber(null, 'kg', true)).toBe(`?${StringHelper.NONBREAKING_SPACE}kg`);
  });

  it('formats number without rounding when roundUpOrDown is false', () => {
    expect(NumberHelper.formatNumber(12.3456, null, false, ',', null, 2)).toBe('12,34');
  });

  it('applies rounding, thousands separator and unit when requested', () => {
    const result = NumberHelper.formatNumber(1234.556, 'm', true, ',', '.', 2);
    expect(result).toBe(`1.234,56${StringHelper.NONBREAKING_SPACE}m`);
  });

  it('formats whole numbers without decimals when using 0 decimal places', () => {
    expect(NumberHelper.formatNumber(146, 'kcal', false, ',', '.', 0)).toBe(`146${StringHelper.NONBREAKING_SPACE}kcal`);
    expect(NumberHelper.formatNumber(3000, 'g', false, ',', '.', 0)).toBe(`3.000${StringHelper.NONBREAKING_SPACE}g`);
  });

  it('formats decimal numbers with comma separator', () => {
    expect(NumberHelper.formatNumber(4.8, 'g', false, ',', '.', 1)).toBe(`4,8${StringHelper.NONBREAKING_SPACE}g`);
    expect(NumberHelper.formatNumber(19.8, 'g', false, ',', '.', 1)).toBe(`19,8${StringHelper.NONBREAKING_SPACE}g`);
    expect(NumberHelper.formatNumber(0.1, 'g', false, ',', '.', 1)).toBe(`0,1${StringHelper.NONBREAKING_SPACE}g`);
  });
});
