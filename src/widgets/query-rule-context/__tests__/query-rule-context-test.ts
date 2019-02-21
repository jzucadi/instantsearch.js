import queryRuleContext from '../query-rule-context';

describe('queryRuleContext', () => {
  describe('Usage', () => {
    test('does not throw without options', () => {
      expect(() => {
        queryRuleContext({});
      }).not.toThrow();
    });
  });
});
