export class EmailHelper {
  // Domain is matched as dot-separated, dot-free labels: unambiguous and thus
  // linear-time (no catastrophic backtracking, SonarCloud S5852).
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

  static sanitize(email: string): string {
    return email.trim();
  }

  static isValid(email: string): boolean {
    return EmailHelper.EMAIL_REGEX.test(EmailHelper.sanitize(email));
  }

  static sanitizeAndValidate(email: string): { trimmedEmail: string; isValid: boolean } {
    const trimmedEmail = EmailHelper.sanitize(email);
    return {
      trimmedEmail,
      isValid: EmailHelper.EMAIL_REGEX.test(trimmedEmail),
    };
  }
}
