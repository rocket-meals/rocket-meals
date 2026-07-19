import { StringHelper } from './StringHelper';

export class NumberHelper {
  // Improved version of toFixedNoRounding
  static toFixedNoRounding(number: number, fractions: number): string {
    const strNumber = number.toString();
    const dotIndex = strNumber.indexOf('.');
    if (dotIndex === -1) {
      // integer, insert decimal dot and pad up zeros
      return strNumber + '.' + '0'.repeat(fractions);
    }
    const integerPart = strNumber.slice(0, dotIndex);
    const fractionalPart = strNumber.slice(dotIndex + 1);
    const truncatedFraction = fractionalPart.slice(0, fractions); // truncate to the required fractions
    const additionalZeros = '0'.repeat(fractions - truncatedFraction.length);
    return `${integerPart}.${truncatedFraction}${additionalZeros}`;
  }

  // Improved version of formatNumber with clear logic and less redundancy
  static formatNumber(value: number | null | undefined, unit: string | null | undefined, roundUpOrDown: boolean, fractionsSeparator: string = ',', thousandsSeparator: string | null = null, amountDecimals: number = 2): string {
    // Return early if value is null or undefined
    if (value == null) {
      return `?${unit ? StringHelper.NONBREAKING_SPACE + unit : ''}`;
    }

    // Handle rounding based on roundUpOrDown flag
    let formattedValue = roundUpOrDown ? value.toFixed(amountDecimals) : NumberHelper.toFixedNoRounding(value, amountDecimals);

    // Replace dot with fractions separator
    formattedValue = formattedValue.replace('.', fractionsSeparator);

    // Format thousands separators if necessary
    if (thousandsSeparator) {
      const [integerPart, fractionPart] = formattedValue.split(fractionsSeparator);
      if (!integerPart) {
        formattedValue = `0${fractionsSeparator}${fractionPart || ''}`;
      } else {
        const formattedInteger = NumberHelper.insertThousandsSeparator(integerPart, thousandsSeparator);
        formattedValue = fractionPart ? `${formattedInteger}${fractionsSeparator}${fractionPart}` : formattedInteger;
      }
    }

    // Add unit suffix if provided
    const suffix = unit ? StringHelper.NONBREAKING_SPACE + unit : '';
    return formattedValue + suffix;
  }

  // Inserts the separator between every group of three digits (counted from the
  // right). Implemented without a regex: the previously used lookahead pattern
  // had super-linear worst-case runtime (SonarCloud S5852).
  private static insertThousandsSeparator(integerPart: string, separator: string): string {
    const sign = integerPart.startsWith('-') ? '-' : '';
    const digits = sign ? integerPart.slice(1) : integerPart;
    let result = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 === 0) {
        result += separator;
      }
      result += digits[i];
    }
    return sign + result;
  }

  // Formats a number with compact abbreviations: up to 999 shown as-is,
  // then 1k, 1.5k, 1m, 1.5m, etc. (truncates, does not round).
  static formatCompact(value: number): string {
    if (value >= 1_000_000) {
      const truncated = Math.floor(value / 100_000) / 10;
      const formatted = truncated % 1 === 0 ? String(Math.floor(truncated)) : String(truncated);
      return formatted + 'm';
    }
    if (value >= 1_000) {
      const truncated = Math.floor(value / 100) / 10;
      const formatted = truncated % 1 === 0 ? String(Math.floor(truncated)) : String(truncated);
      return formatted + 'k';
    }
    return String(value);
  }
}
