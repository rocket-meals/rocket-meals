import { StringHelper } from '../StringHelper';
import { FormHelperCommon } from './FormHelperCommon';
import { IbanValidationHelper } from './IbanValidationHelper';

/**
 * A single IBAN found in recognized text.
 *
 * `checksumValid` and `lengthValid` are reported separately on purpose: a
 * printed sample card (e.g. the `DE00 0123 4567 8901 2345 67` on the giro card
 * fixture in `__tests__/fixtures/girocard`) has the right shape but a dummy
 * check digit, and a caller that only wants to *demo* the scanner still needs
 * to see that candidate.
 */
export interface IbanCandidate {
  /** Uppercase, without separators, e.g. `DE89370400440532013000`. */
  iban: string;
  /** Grouped in blocks of four, e.g. `DE89 3704 0044 0532 0130 00`. */
  formatted: string;
  countryCode: string;
  /** The ISO 13616 mod-97 check digits match. */
  checksumValid: boolean;
  /** The length matches the IBAN registry entry for `countryCode`. */
  lengthValid: boolean;
  /**
   * Length *and* character pattern match what the country prints — the check
   * digits' own arithmetic left aside. See {@link IbanValidationHelper}.
   */
  structureValid: boolean;
  /**
   * The reading sits on the card the way a printed number does: in groups of at
   * most four, ending where one of the groups ends. A reading that fails this
   * has grown into the text around the number — a bank name, a cardholder, a
   * `Gültig bis` — and is only ever accepted because its checksum vouches for
   * it.
   */
  looksPrinted: boolean;
}

/** One IBAN-shaped run of characters, as it was found in the recognized text. */
interface IbanShapedRun {
  /** Letters and digits only, the printed blocks already glued together. */
  run: string;
  /**
   * The run stops at a place a printed number can stop: where one of the
   * groups ends, or inside a group of digits that an engine welded to the
   * validity date behind it. What it must not do is stop inside a word.
   */
  endsCleanly: boolean;
  /**
   * The run's first four characters are exactly one printed group.
   *
   * A printed IBAN opens with `XX00` as its own group. A reading whose head is
   * half of a word, or spread across two tokens, is the weaker guess when
   * nothing else tells the two apart.
   */
  headIsOwnBlock: boolean;
}

export interface FindIbanOptions {
  /**
   * Accept a candidate whose mod-97 check digits do not match. Off by default —
   * a failing checksum is the cheapest signal that OCR misread a character.
   *
   * It waives the check digits and nothing else: country, length and character
   * pattern still have to hold, and so does the printed shape below.
   */
  allowInvalidChecksum?: boolean;
}

/**
 * Finds an IBAN in the text lines an OCR engine returns for a photo of a bank
 * card (giro card, debit card, EC card).
 *
 * The helper is deliberately free of any camera or OCR dependency: it takes the
 * recognized lines and hands back the best IBAN in them, so that the same logic
 * can be unit tested against stored OCR output and reused by any app.
 */
export class IbanRecognitionHelper {
  /** Shortest and longest IBAN in the registry — used to bound the scan regex. */
  static readonly MIN_IBAN_LENGTH = IbanValidationHelper.MIN_IBAN_LENGTH;
  static readonly MAX_IBAN_LENGTH = IbanValidationHelper.MAX_IBAN_LENGTH;

  /** IBAN length per country. Kept in {@link IbanValidationHelper}, which owns validation. */
  static readonly IBAN_LENGTH_BY_COUNTRY = IbanValidationHelper.IBAN_LENGTH_BY_COUNTRY;

  /**
   * Glyphs an OCR engine confuses with a digit. Applied only where the IBAN
   * grammar demands a digit (the two check digits), never to the whole string —
   * the account part of many IBANs legitimately contains letters.
   */
  private static readonly LETTER_TO_DIGIT: Readonly<Record<string, string>> = {
    O: '0', Q: '0', D: '0', I: '1', L: '1', T: '1', Z: '2', E: '3', A: '4',
    S: '5', G: '6', B: '8',
  };

  /** The reverse direction, for the two leading country letters. */
  private static readonly DIGIT_TO_LETTER: Readonly<Record<string, string>> = {
    '0': 'O', '1': 'I', '2': 'Z', '4': 'A', '5': 'S', '6': 'G', '8': 'B',
  };

  /**
   * What a card prints directly in front of the number. Kept as a list rather
   * than stripped by a pattern: only a label that is actually printed may make
   * a reading start somewhere other than at the beginning of a word.
   */
  private static readonly PRINTED_LABELS: readonly string[] = ['IBAN'];

  /** A card prints its IBAN in groups of four. */
  private static readonly PRINTED_BLOCK_LENGTH = 4;

  /** Uppercases and drops everything that cannot be part of an IBAN. */
  static normalizeIban(text: string): string {
    return IbanValidationHelper.normalize(text);
  }

  /** Groups an IBAN in blocks of four, the way it is printed on a card. */
  static formatIban(iban: string): string {
    return FormHelperCommon.formatIban(iban);
  }

  /** Verifies the ISO 13616 / ISO 7064 mod-97-10 check digits. */
  static isValidIbanChecksum(iban: string): boolean {
    return IbanValidationHelper.hasValidChecksum(iban);
  }

  /**
   * True when every letter in the reading sits where an IBAN always carries
   * one: the two country letters, and the two check digits an engine may have
   * read as letters.
   *
   * This is the strongest thing a reading has going for it when the caller has
   * waived the checksum. `Gültig bis DE00 …` welds into `LT16BISDE00012345678`
   * — Lithuania, correct length, entirely invented, and its giveaway is the
   * `BIS` sitting in the middle of it.
   *
   * The price is that a country whose account part legitimately carries letters
   * (GB, NL, GI and others) is not recognized without a valid checksum. A real
   * card always has one; only a specimen card with dummy check digits does not,
   * and inventing a number for one of those is the worse outcome.
   */
  static hasNoLettersInBody(iban: string): boolean {
    return !/[A-Z]/.test(IbanRecognitionHelper.normalizeIban(iban).slice(4));
  }

  /** True when the length matches the registry entry for the country. */
  static hasValidIbanLength(iban: string): boolean {
    return IbanValidationHelper.hasValidLength(iban);
  }

  /**
   * Repairs the characters an OCR engine typically gets wrong, position by
   * position: the first two characters must be letters, the next two digits.
   */
  static repairOcrConfusions(candidate: string): string {
    const normalized = IbanRecognitionHelper.normalizeIban(candidate);
    const characters = normalized.split('');
    for (let index = 0; index < characters.length && index < 4; index++) {
      const character = characters[index];
      if (character === undefined) {
        continue;
      }
      if (index < 2) {
        characters[index] = IbanRecognitionHelper.DIGIT_TO_LETTER[character] ?? character;
      } else {
        characters[index] = IbanRecognitionHelper.LETTER_TO_DIGIT[character] ?? character;
      }
    }
    return characters.join('');
  }

  /**
   * The readings of one recognized run that are worth checking, best guess
   * first: head repaired, head repaired plus a numeric body where the country
   * allows only digits there, and the untouched reading.
   */
  static buildReadings(rawCandidate: string): string[] {
    const normalized = IbanRecognitionHelper.normalizeIban(rawCandidate);
    const headRepaired = IbanRecognitionHelper.repairOcrConfusions(normalized);
    const readings = [headRepaired, normalized];

    if (IbanValidationHelper.hasNumericBban(headRepaired.slice(0, 2))) {
      const body = headRepaired.slice(4).split('');
      for (let index = 0; index < body.length; index++) {
        const character = body[index];
        if (character === undefined) {
          continue;
        }
        body[index] = IbanRecognitionHelper.LETTER_TO_DIGIT[character] ?? character;
      }
      readings.splice(1, 0, headRepaired.slice(0, 4) + body.join(''));
    }

    return readings;
  }

  /**
   * Describes a normalized string as an {@link IbanCandidate}. `looksPrinted`
   * cannot be seen from the string alone - it says where the reading came from
   * in the recognized text - so a caller holding a bare string says so.
   */
  static describeCandidate(candidate: string, looksPrinted = true): IbanCandidate {
    const iban = IbanRecognitionHelper.normalizeIban(candidate);
    return {
      iban,
      formatted: IbanRecognitionHelper.formatIban(iban),
      countryCode: iban.slice(0, 2),
      checksumValid: IbanRecognitionHelper.isValidIbanChecksum(iban),
      lengthValid: IbanRecognitionHelper.hasValidIbanLength(iban),
      structureValid: IbanValidationHelper.hasValidStructure(iban),
      looksPrinted,
    };
  }

  /**
   * Collects every IBAN-shaped run of characters in the recognized lines.
   *
   * OCR engines split a card differently on every frame — sometimes the IBAN is
   * one line, sometimes the label `IBAN:` sits in front of it, sometimes the
   * number is torn into two lines. Lines are therefore scanned individually,
   * then glued to their neighbour, so a torn number is still found.
   *
   * Only readings whose length matches their country are returned, best-first:
   * the ones whose checksum adds up, then the ones that at least sit on the
   * card the way a printed number does.
   */
  static findIbanCandidates(lines: string[]): IbanCandidate[] {
    const searchSpaces: string[] = [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index] ?? '';
      searchSpaces.push(line);
      const nextLine = lines[index + 1];
      if (nextLine !== undefined) {
        searchSpaces.push(line + ' ' + nextLine);
      }
    }

    // The same reading turns up in several search spaces - as its own line and
    // again in the pair it forms with its neighbour. It is kept once, with the
    // best shape any of those runs gave it.
    const byReading = new Map<string, IbanCandidate>();
    /** Ranking only: which readings opened with a printed group of their own. */
    const headIsOwnBlockByReading = new Map<string, boolean>();
    for (const searchSpace of searchSpaces) {
      for (const shapedRun of IbanRecognitionHelper.extractIbanShapedRuns(searchSpace)) {
        // Asked of the run as the engine read it, not of the readings derived
        // from it: for a country whose account part is all digits those
        // readings have had their letters mapped to digits already, which would
        // hide exactly the `BIS` this is looking for.
        const looksPrinted = shapedRun.endsCleanly && IbanRecognitionHelper.hasNoLettersInBody(shapedRun.run);
        for (const reading of IbanRecognitionHelper.buildReadings(shapedRun.run)) {
          const known = byReading.get(reading);
          if (known !== undefined) {
            known.looksPrinted = known.looksPrinted || looksPrinted;
            headIsOwnBlockByReading.set(reading, (headIsOwnBlockByReading.get(reading) ?? false) || shapedRun.headIsOwnBlock);
            continue;
          }
          headIsOwnBlockByReading.set(reading, shapedRun.headIsOwnBlock);
          const described = IbanRecognitionHelper.describeCandidate(reading, looksPrinted);
          // Only a reading the standard could have produced is a candidate:
          // right country, right length, and every position carrying the kind
          // of character that country prints there. A reading that is one
          // character too long can still pass mod-97 by chance - the fixture
          // card does, when the `G` of the `Gültig bis` below the number is
          // read into it.
          if (described.structureValid) {
            byReading.set(reading, described);
          }
        }
      }
    }

    return Array.from(byReading.values()).sort((a, b) => {
      const byChecksum = Number(b.checksumValid) - Number(a.checksumValid);
      if (byChecksum !== 0) {
        return byChecksum;
      }
      const byShape = Number(b.looksPrinted) - Number(a.looksPrinted);
      if (byShape !== 0) {
        return byShape;
      }
      // Last resort, and it settles the case where a word in front of the
      // number is itself IBAN-shaped: a printed number opens with `XX00` as a
      // group of its own, a reading starting inside `bis DE00 …` does not.
      return Number(headIsOwnBlockByReading.get(b.iban) ?? false) - Number(headIsOwnBlockByReading.get(a.iban) ?? false);
    });
  }

  /**
   * Returns the IBAN to hand back to the user, or `null` while nothing was
   * recognized well enough yet. Called once per camera frame, so a `null` here
   * simply means "keep scanning".
   */
  static findIban(lines: string[], options?: FindIbanOptions): IbanCandidate | null {
    const candidates = IbanRecognitionHelper.findIbanCandidates(lines);
    const accepted = candidates.find((candidate) => {
      // What an IBAN is, the validator decides - country, length, character
      // pattern, and the check digits unless the caller waived them.
      if (!IbanValidationHelper.isValidIban(candidate.iban, { ignoreChecksum: options?.allowInvalidChecksum })) {
        return false;
      }
      // Where it came from is this helper's own question, and with the checksum
      // waived nothing vouches for the number but its shape - so the shape has
      // to hold up. A caller that waives the checksum must not be handed a
      // Burundian IBAN assembled out of `bis`, `den` and `VISA`.
      return candidate.checksumValid || candidate.looksPrinted;
    });
    return accepted ?? null;
  }

  /**
   * Finds the runs of letters and digits that could be an IBAN.
   *
   * A number is only ever read from where the card starts printing one. The
   * blocks of four are glued back together, and a run may begin at the first
   * character of a printed word — never in the middle of one. Without that
   * rule, `Volksbank Oberberg` collapses into `...NKOBERBERG...`, and a window
   * sliding through it eventually lands on something shaped like `NO53` and
   * hands back an IBAN that is nowhere on the card. Roughly one in ninety-seven
   * of those inventions passes the mod-97 check by chance, and the scanner
   * looks at several frames a second.
   */
  private static extractIbanShapedRuns(text: string): IbanShapedRun[] {
    const upperCased = text.toUpperCase();
    // Everything that is neither a letter nor a digit separates two tokens:
    // the spaces between the printed blocks as well as the colon behind a
    // label and the slash inside a validity date.
    const cleaned = StringHelper.replaceAllWithOptions({
      str: upperCased,
      find: '[^A-Z0-9]',
      replace: ' ',
    });
    const tokens = cleaned.split(' ').filter((token) => token.length > 0);

    const shapedRuns: IbanShapedRun[] = [];
    for (let first = 0; first < tokens.length; first++) {
      // The blocks of a printed number come back as separate tokens, so they
      // are glued to the token they start at. Twice the longest IBAN is more
      // than any of the readings below can use, and bounds the work.
      let glued = '';
      const blockEnds = new Set<number>();
      /** Where the first token of this run ends, to see whether it is a group. */
      let firstBlockEnd = 0;
      /** Per position: does the token covering it carry any letter at all? */
      const isInsideTokenWithLetter: boolean[] = [];
      for (let index = first; index < tokens.length && glued.length < IbanRecognitionHelper.MAX_IBAN_LENGTH * 2; index++) {
        const token = tokens[index] ?? '';
        const tokenHasLetter = /[A-Z]/.test(token);
        for (let position = 0; position < token.length; position++) {
          isInsideTokenWithLetter.push(tokenHasLetter);
        }
        glued += token;
        blockEnds.add(glued.length);
        if (index === first) {
          firstBlockEnd = glued.length;
        }
      }

      for (const start of IbanRecognitionHelper.readingStartsOf(glued)) {
        const run = glued.slice(start, start + IbanRecognitionHelper.MAX_IBAN_LENGTH);
        if (run.length < IbanRecognitionHelper.MIN_IBAN_LENGTH) {
          continue;
        }
        const repairedHead = IbanRecognitionHelper.repairOcrConfusions(run.slice(0, 4));
        if (!/^[A-Z]{2}\d{2}$/.test(repairedHead)) {
          continue;
        }
        const headIsOwnBlock = firstBlockEnd - start === IbanRecognitionHelper.PRINTED_BLOCK_LENGTH;
        const describeRun = (length: number): IbanShapedRun => ({
          run: run.slice(0, length),
          // Stopping inside a group is allowed as long as that group is digits:
          // an engine regularly welds the last group to the date behind it.
          endsCleanly: blockEnds.has(start + length) || isInsideTokenWithLetter[start + length] === false,
          headIsOwnBlock,
        });
        const expectedLength = IbanValidationHelper.getIbanLength(repairedHead.slice(0, 2));
        if (expectedLength !== undefined && expectedLength <= run.length) {
          // The number ends where its country says it ends; what follows is
          // the next thing printed on the card, usually the validity date.
          shapedRuns.push(describeRun(expectedLength));
        }
        // Also offer the run as it stands, for a country whose length is not
        // in the registry or a number the engine cut short.
        shapedRuns.push(describeRun(run.length));
      }
    }
    return shapedRuns;
  }

  /**
   * The positions inside a glued run at which a number may begin: its first
   * character, and whatever follows a label the card prints in front of the
   * number. OCR regularly loses the colon and the space behind such a label,
   * which welds it to the first block.
   */
  private static readingStartsOf(run: string): number[] {
    const starts = [0];
    for (const label of IbanRecognitionHelper.PRINTED_LABELS) {
      if (run.startsWith(label) && !starts.includes(label.length)) {
        starts.push(label.length);
      }
    }
    return starts;
  }
}
