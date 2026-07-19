import { MathHelper } from 'repo-depkit-common';

describe('MathHelper.random', () => {
  it('returns values in the interval [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const value = MathHelper.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('MathHelper.randomIntBetween', () => {
  it('stays within the inclusive bounds', () => {
    for (let i = 0; i < 1000; i++) {
      const value = MathHelper.randomIntBetween(1, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it('eventually hits both endpoints', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      seen.add(MathHelper.randomIntBetween(1, 2));
    }
    expect(seen.has(1)).toBe(true);
    expect(seen.has(2)).toBe(true);
  });

  it('returns min when min equals max', () => {
    expect(MathHelper.randomIntBetween(5, 5)).toBe(5);
  });

  it('throws when max is smaller than min', () => {
    expect(() => MathHelper.randomIntBetween(2, 1)).toThrow();
  });
});

describe('MathHelper.randomBase36String', () => {
  it('returns a string of the requested length', () => {
    expect(MathHelper.randomBase36String(6)).toHaveLength(6);
    expect(MathHelper.randomBase36String(0)).toBe('');
  });

  it('only contains base36 characters', () => {
    const value = MathHelper.randomBase36String(100);
    expect(value).toMatch(/^[0-9a-z]+$/);
  });
});
