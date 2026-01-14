import { EXPO_APPLE_TEAM_ID, EXPO_APPLE_TEAM_TYPE, EXPO_ASC_ISSUER_ID, EXPO_ASC_KEY_ID } from '../app/config';

export type EasSubmitEnvVariables = {
  EXPO_ASC_KEY_ID: string;
  EXPO_ASC_ISSUER_ID: string;
  EXPO_APPLE_TEAM_ID: string;
  EXPO_APPLE_TEAM_TYPE: string;
};

export function getEasSubmitEnvVariables(): EasSubmitEnvVariables {
  return {
    EXPO_ASC_KEY_ID,
    EXPO_ASC_ISSUER_ID,
    EXPO_APPLE_TEAM_ID,
    EXPO_APPLE_TEAM_TYPE,
  };
}
