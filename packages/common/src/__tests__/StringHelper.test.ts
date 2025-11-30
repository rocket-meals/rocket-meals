import { StringHelper } from 'repo-depkit-common';

describe('StringHelper.replaceAll', () => {
  it('replaces all literal occurrences including regex characters', () => {
    const result = StringHelper.replaceAll('a*b*c', '*', '-');
    expect(result).toBe('a-b-c');
  });

  it('replaces repeated substring safely', () => {
    const result = StringHelper.replaceAll('[1].value + [2].value', '[', '(');
    expect(result).toBe('(1].value + (2].value');
  });
});
