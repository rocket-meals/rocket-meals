export declare class NumberHelper {
    static toFixedNoRounding(number: number, fractions: number): string;
    static formatNumber(value: number | null | undefined, unit: string | null | undefined, roundUpOrDown: boolean, fractionsSeparator?: string, thousandsSeparator?: string | null, amountDecimals?: number): string;
}
