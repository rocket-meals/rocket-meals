/**
 * food-feedback-guest-restriction-hook – setzt die Einstellungen für nicht verifizierte Profile bei
 * Speisen-Rückmeldungen serverseitig durch.
 *
 * Nicht verifizierte Profile (`profiles.verified === false`, z. B. Gäste ohne eigene E-Mail-Adresse)
 * haben dieselbe Rolle `User` wie alle anderen, die Directus-Policies können sie also nicht
 * unterscheiden. Deshalb prüft dieser Hook beim Anlegen und Ändern von `foods_feedbacks`, ob für das
 * Profil des Feedbacks gerade eine Bewertung oder ein Kommentar gesetzt wird, obwohl die App-Settings
 * das für nicht verifizierte Profile verbieten (Auswertung in `FoodFeedbackPermissionHelper`). Die App
 * blendet die Eingaben bereits aus; dieser Hook fängt ältere App-Versionen und direkte API-Aufrufe ab.
 */

import { defineHook } from '@directus/extensions-sdk';
import { PrimaryKey } from '@directus/types';
import { CollectionNames, DatabaseTypes, FoodFeedbackPermissionHelper } from 'repo-depkit-common';
import { MyDatabaseHelper, MyEventContext } from '../helpers/MyDatabaseHelper';
import { createMyForbiddenError } from '../helpers/MyDirectusError';
import { BackendTranslator, ProfileWithLanguage } from '../helpers/translations';
import { findGuestFoodFeedbackViolation } from './GuestFoodFeedbackRestriction';

const HOOK_NAME = 'food-feedback-guest-restriction-hook';

type ProfileVerification = Pick<DatabaseTypes.Profiles, 'id' | 'verified'> & ProfileWithLanguage;

function getProfileId(profile: DatabaseTypes.FoodsFeedbacks['profile'] | undefined): string | undefined {
  if (typeof profile === 'string') {
    return profile;
  }
  return profile?.id ?? undefined;
}

async function readUnverifiedProfile(myDatabaseHelper: MyDatabaseHelper, profileIds: string[]): Promise<ProfileVerification | undefined> {
  if (profileIds.length === 0) {
    return undefined;
  }
  const profiles = (await myDatabaseHelper.getProfilesHelper().readMany(profileIds, {
    // The language is needed to render the error message.
    fields: ['id', 'verified', 'language'],
  })) as ProfileVerification[];
  return profiles.find(profile => profile.verified === false);
}

export default defineHook(({ filter }, apiContext) => {
  async function readExistingFeedbacks(myDatabaseHelper: MyDatabaseHelper, keys: PrimaryKey[]): Promise<DatabaseTypes.FoodsFeedbacks[]> {
    if (keys.length === 0) {
      return [];
    }
    return await myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.FoodsFeedbacks>(CollectionNames.FOODS_FEEDBACKS).readMany(keys, {
      fields: ['id', 'rating', 'comment', 'comment_history', 'date_created', 'date_updated', 'profile'],
    });
  }

  async function assertProfileMayWrite(input: unknown, keys: PrimaryKey[], eventContext: MyEventContext) {
    const payload = (input ?? {}) as Partial<DatabaseTypes.FoodsFeedbacks>;
    if (!('rating' in payload) && !('comment' in payload) && !('comment_history' in payload)) {
      return;
    }

    const myDatabaseHelper = new MyDatabaseHelper(apiContext, eventContext);
    const existingFeedbacks = await readExistingFeedbacks(myDatabaseHelper, keys);
    const profileIds = [...new Set([getProfileId(payload.profile), ...existingFeedbacks.map(feedback => getProfileId(feedback.profile))])].filter(
      (id): id is string => !!id
    );
    const unverifiedProfile = await readUnverifiedProfile(myDatabaseHelper, profileIds);
    if (!unverifiedProfile) {
      return;
    }

    const appSettings = await myDatabaseHelper.getAppSettingsHelper().getAppSettings();
    const permissions = FoodFeedbackPermissionHelper.getPermissions(appSettings, true);
    const violation = findGuestFoodFeedbackViolation(payload, existingFeedbacks, permissions);
    if (!violation) {
      return;
    }

    apiContext.logger.info(`${HOOK_NAME}: blocked ${violation} for unverified profile ${unverifiedProfile.id}`);
    throw createMyForbiddenError(BackendTranslator.getTranslatorForProfile(unverifiedProfile)(violation));
  }

  filter(CollectionNames.FOODS_FEEDBACKS + '.items.create', async (input, _meta, eventContext: MyEventContext) => {
    await assertProfileMayWrite(input, [], eventContext);
    return input;
  });

  filter(CollectionNames.FOODS_FEEDBACKS + '.items.update', async (input, meta, eventContext: MyEventContext) => {
    const keys = Array.isArray(meta?.keys) ? (meta.keys as PrimaryKey[]) : [];
    await assertProfileMayWrite(input, keys, eventContext);
    return input;
  });
});
