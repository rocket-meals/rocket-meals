import { UriScheme } from '@/constants/UriScheme';

type ContentPatterns = {
	email: RegExp;
	link: RegExp;
	image: RegExp;
	heading: RegExp;
};

const LINK_SCHEME_PATTERN = `(?:https?:\\/\\/|${UriScheme.GEO}|${UriScheme.MAPS}|${UriScheme.TEL})`;

// The character classes exclude the opening bracket/parenthesis as well, so the
// patterns are unambiguous and run in linear time (SonarCloud S5852: no
// catastrophic backtracking).
export const markdownContentPatterns: ContentPatterns = {
	email: new RegExp(`\\[([^\\[\\]]+)]\\((${UriScheme.MAILTO}[^()]+)\\)`),
	link: new RegExp(`\\[([^\\[\\]]+)]\\((${LINK_SCHEME_PATTERN}[^()]+)\\)`),
	image: /!\[([^\]]*)]\(([^)]+)\)/,
	heading: /^#{1,6}[ \t]*(\S.*)?$/,
};
