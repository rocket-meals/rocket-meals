// Minimal structural type so this helper works in every runtime (Node, browser,
// Expo/React Native) without depending on DOM or Node type definitions.
type CryptoLike = {
  getRandomValues(array: Uint32Array): Uint32Array;
};

/**
 * Central place for all randomness in the repository.
 *
 * `Math.random()` is a pseudorandom number generator and gets flagged by
 * SonarCloud (rule S2245) wherever it is used. All random values should
 * therefore be produced through this class: it prefers the cryptographically
 * secure Web Crypto API (`crypto.getRandomValues`, available in Node 19+,
 * browsers and Expo/React Native) and only falls back to `Math.random()` in
 * exotic runtimes without Web Crypto support.
 */
export class MathHelper {
  private static readonly BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
  private static readonly UINT32_RANGE = 4294967296; // 2^32

  private static getCrypto(): CryptoLike | undefined {
    const cryptoCandidate = (globalThis as { crypto?: CryptoLike }).crypto;
    if (cryptoCandidate && typeof cryptoCandidate.getRandomValues === 'function') {
      return cryptoCandidate;
    }
    return undefined;
  }

  /**
   * Returns a random float in the interval [0, 1) - a drop-in replacement for
   * `Math.random()`, but backed by a cryptographically secure generator where
   * available.
   */
  static random(): number {
    const cryptoObj = MathHelper.getCrypto();
    if (cryptoObj) {
      const buffer = new Uint32Array(1);
      cryptoObj.getRandomValues(buffer);
      return buffer[0] / MathHelper.UINT32_RANGE;
    }
    // Fallback for runtimes without Web Crypto. The random values produced by
    // this class are used for non-security purposes (dice rolls, local ids),
    // so a pseudorandom fallback is acceptable here.
    return Math.random(); // NOSONAR (typescript:S2245) - deliberate single fallback, see comment above
  }

  /**
   * Returns a random integer in the inclusive range [minInclusive, maxInclusive].
   * Example: `randomIntBetween(1, 6)` rolls a standard die.
   */
  static randomIntBetween(minInclusive: number, maxInclusive: number): number {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    if (max < min) {
      throw new Error(`randomIntBetween: max (${maxInclusive}) must not be smaller than min (${minInclusive})`);
    }
    return min + Math.floor(MathHelper.random() * (max - min + 1));
  }

  /**
   * Returns a random string of the given length using the base36 alphabet
   * (0-9, a-z). Useful as the random part of locally generated ids and a
   * replacement for the `Math.random().toString(36).slice(2)` idiom.
   */
  static randomBase36String(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += MathHelper.BASE36_ALPHABET[MathHelper.randomIntBetween(0, MathHelper.BASE36_ALPHABET.length - 1)];
    }
    return result;
  }
}
