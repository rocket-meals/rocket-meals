export class NumberHelper {
  static toFixedNoRounding(number: number, fractions: number): string {
    const strNumber = number.toString();
    const dotIndex = strNumber.indexOf('.');
    if (dotIndex === -1) {
      return strNumber + '.' + '0'.repeat(fractions);
    }
    const integerPart = strNumber.slice(0, dotIndex);
    const fractionalPart = strNumber.slice(dotIndex + 1);
    const truncatedFraction = fractionalPart.slice(0, fractions);
    const additionalZeros = '0'.repeat(fractions - truncatedFraction.length);
    return `${integerPart}.${truncatedFraction}${additionalZeros}`;
  }

  static formatNumber(
    value: number | null | undefined,
    unit: string | null | undefined,
    roundUpOrDown: boolean,
    fractionsSeparator: string = ',',
    thousandsSeparator: string | null = null,
    amountDecimals: number = 2
  ): string {
    if (value == null) {
      return `?${unit ? '\u00a0' + unit : ''}`;
    }

    let formattedValue = roundUpOrDown
      ? value.toFixed(amountDecimals)
      : NumberHelper.toFixedNoRounding(value, amountDecimals);

    formattedValue = formattedValue.replace('.', fractionsSeparator);

    if (thousandsSeparator) {
      const [integerPart, fractionPart] = formattedValue.split(fractionsSeparator);
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
      formattedValue = fractionPart
        ? `${formattedInteger}${fractionsSeparator}${fractionPart}`
        : formattedInteger;
    }

    const suffix = unit ? '\u00a0' + unit : '';
    return formattedValue + suffix;
  }
}
