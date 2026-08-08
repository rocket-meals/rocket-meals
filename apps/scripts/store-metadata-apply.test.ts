import { AscApiError } from './asc-api';
import { ApplePushPlan, applyApplePush, isContentRightsLockedError } from './store-metadata-apple';

jest.mock('./asc-api', () => ({
  ...jest.requireActual('./asc-api'),
  ascRequest: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ascRequest } = require('./asc-api') as { ascRequest: jest.Mock };

function contentRightsLockedError(): AscApiError {
  return new AscApiError(
    409,
    [{ code: 'ENTITY_ERROR.ATTRIBUTE.INVALID.INVALID_STATE', source: { pointer: 'contentRightsDeclaration' } }],
    '{"errors":[]}',
    'PATCH',
    '/apps/app-1'
  );
}

function contentRightsOnlyPlan(): ApplePushPlan {
  return {
    current: {
      appId: 'app-1',
      bundleId: 'de.example.app',
      name: 'Example',
      contentRightsDeclaration: 'USES_THIRD_PARTY_CONTENT',
      appStoreAgeRating: undefined,
      appInfos: [],
    },
    targetAppInfo: undefined,
    ageRatingChanges: [],
    categoryChanges: [],
    contentRightsChanges: [{ key: 'contentRightsDeclaration', from: 'USES_THIRD_PARTY_CONTENT', to: 'DOES_NOT_USE_THIRD_PARTY_CONTENT' }],
    localizationChanges: [],
    missingFields: [],
  };
}

describe('isContentRightsLockedError', () => {
  it('matches the 409 INVALID_STATE error Apple returns for a locked contentRightsDeclaration', () => {
    expect(isContentRightsLockedError(contentRightsLockedError())).toBe(true);
  });

  it('does not match other errors', () => {
    expect(isContentRightsLockedError(new Error('network down'))).toBe(false);
    expect(isContentRightsLockedError(new AscApiError(409, [{ code: 'ENTITY_ERROR.RELATIONSHIP.INVALID' }], '', 'PATCH', '/apps/app-1'))).toBe(false);
    expect(
      isContentRightsLockedError(new AscApiError(403, [{ code: 'ENTITY_ERROR.ATTRIBUTE.INVALID.INVALID_STATE', source: { pointer: 'contentRightsDeclaration' } }], '', 'PATCH', '/apps/app-1'))
    ).toBe(false);
  });
});

describe('applyApplePush content rights', () => {
  beforeEach(() => {
    ascRequest.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('continues with a warning when Apple locks contentRightsDeclaration', async () => {
    ascRequest.mockRejectedValueOnce(contentRightsLockedError());
    await expect(applyApplePush('token', contentRightsOnlyPlan(), false)).resolves.toBe(true);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('gesperrt'));
  });

  it('still fails on any other error', async () => {
    ascRequest.mockRejectedValueOnce(new AscApiError(500, [], 'boom', 'PATCH', '/apps/app-1'));
    await expect(applyApplePush('token', contentRightsOnlyPlan(), false)).rejects.toBeInstanceOf(AscApiError);
  });
});
