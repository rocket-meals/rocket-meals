import { FetchIgnoreSelfSignedCertHelper } from './FetchIgnoreSelfSignedCertHelper';

/**
 * Creates Directus notifications (directus_notifications). Directus sends these out by email
 * to every recipient that has email notifications enabled, so this is the cheapest way to
 * inform the administrators from the sync container without a mail setup of its own.
 *
 * Every method is best effort: a failing notification must never abort a deployment.
 */
export class DirectusNotificationHelper {
  private readonly directusInstanceUrl: string;
  private readonly headers: Headers;

  constructor(directusInstanceUrl: string, headers: Headers) {
    this.directusInstanceUrl = directusInstanceUrl;
    this.headers = headers;
  }

  /**
   * Notifies the admin account the sync is logged in with, plus every additional email address.
   * Returns the number of notifications that were created.
   */
  public async notify(additionalEmails: string[], subject: string, message: string): Promise<number> {
    const recipientIds = new Set<string>();

    const ownUserId = await this.getOwnUserId();
    if (ownUserId) {
      recipientIds.add(ownUserId);
    }

    for (const email of additionalEmails) {
      const userId = await this.getUserIdByEmail(email);
      if (userId) {
        recipientIds.add(userId);
      } else {
        console.warn(`⚠️  Kein Directus-Benutzer für Benachrichtigungs-Adresse gefunden: ${DirectusNotificationHelper.sanitizeForLog(email)}`);
      }
    }

    let created = 0;
    for (const recipientId of recipientIds) {
      if (await this.createNotification(recipientId, subject, message)) {
        created++;
      }
    }
    return created;
  }

  // Values coming from the API or from the environment are logged; strip control characters
  // so they cannot forge additional log lines (log injection).
  private static sanitizeForLog(value: string): string {
    return String(value).replace(/[\x00-\x1f]/g, '');
  }

  private async fetchJson(url: string): Promise<any | undefined> {
    try {
      const response = await FetchIgnoreSelfSignedCertHelper.fetch(url, {
        method: 'GET',
        headers: { Cookie: this.headers.get('cookie') },
      });
      if (!response.ok) {
        console.warn(`⚠️  Directus-Anfrage fehlgeschlagen (${response.status}): ${url}`);
        return undefined;
      }
      return await response.json();
    } catch (error) {
      console.warn('⚠️  Directus-Anfrage fehlgeschlagen:', error);
      return undefined;
    }
  }

  private async getOwnUserId(): Promise<string | undefined> {
    const result = await this.fetchJson(`${this.directusInstanceUrl}/users/me?fields=id`);
    const id = result?.data?.id;
    return typeof id === 'string' ? id : undefined;
  }

  private async getUserIdByEmail(email: string): Promise<string | undefined> {
    const result = await this.fetchJson(`${this.directusInstanceUrl}/users?fields=id&limit=1&filter[email][_eq]=${encodeURIComponent(email)}`);
    const id = result?.data?.[0]?.id;
    return typeof id === 'string' ? id : undefined;
  }

  private async createNotification(recipientId: string, subject: string, message: string): Promise<boolean> {
    try {
      const response = await FetchIgnoreSelfSignedCertHelper.fetch(`${this.directusInstanceUrl}/notifications`, {
        method: 'POST',
        headers: {
          Cookie: this.headers.get('cookie'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipient: recipientId, subject, message }),
      });
      if (!response.ok) {
        console.warn(`⚠️  Benachrichtigung konnte nicht erstellt werden (${response.status} ${response.statusText})`);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('⚠️  Benachrichtigung konnte nicht erstellt werden:', error);
      return false;
    }
  }
}
