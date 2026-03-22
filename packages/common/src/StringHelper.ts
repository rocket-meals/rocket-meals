export type ReplaceOptions = {
  str: string;
  find: string;
  replace: string;
  flags?: string;
}

export class StringHelper {
  static EMPTY_SPACE = '\u200b';
  static NONBREAKING_SPACE = '\u00a0';
  static NONBREAKING_HALF_SPACE = '\u202f'; // Half space non-breaking

  // also be able to replace "*" with "WILDCARD_REPLACEMENT"
  static replaceAllWithOptions(options: ReplaceOptions) {
    const { str, find, replace, flags } = options;
    return str.replace(new RegExp(find, flags ?? 'g'), replace);
  }

  // Safe literal string replacement using split/join (no regex interpretation).
  // Use this when `find` is a plain string (not a regex pattern), especially when
  // it may contain regex special characters like `.`, `+`, `*`, `\`, etc.
  static replaceAllLiteralWithOptions(options: Omit<ReplaceOptions, 'flags'>) {
    const { str, find, replace } = options;
    return str.split(find).join(replace);
  }

  static capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
