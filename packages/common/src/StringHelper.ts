export type ReplaceOptions = {
  str: string;
  find: string;
  replace: string;
}

export class StringHelper {
  static EMPTY_SPACE = '\u200b';
  static NONBREAKING_SPACE = '\u00a0';
  static NONBREAKING_HALF_SPACE = '\u202f'; // Half space non-breaking

  // also be able to replace "*" with "WILDCARD_REPLACEMENT"
  static replaceAllWithOptions(options: ReplaceOptions) {
    const { str, find, replace } = options;
    return str.replace(new RegExp(find, 'g'), replace);
  }

  static capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
