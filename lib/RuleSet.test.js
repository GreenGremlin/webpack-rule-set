/* eslint-env node, jasmine */
const RuleSet = require('./RuleSet');

const mockJsPreloaderRule = {
    test: /\.js$/,
    enforce: 'pre',
};

const mockCssPreloaderRule = {
    test: /\.css/,
    enforce: 'pre',
};

const mockJsRule = {
    test: /\.js$/,
    loader: '/path/to/babel-loader',
};

const mockImageRule = {
    test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
    loader: '/path/to/url-loader',
};

const mockCssRule = {
    test: /\.css/,
    use: [
        '/path/to/style-loader',
        '/path/to/css-loader',
        '/path/to/postcss-loader',
    ],
};

const mockDefaultRule = {
    exclude: [/\.js$/, /\.html$/, /\.json$/],
    loader: '/path/to/file-loader',
};

let mockRuleToAdd = {
    test: /foo/,
    loader: 'mockRuleToAdd',
};

let mockLoaderRules;
let mockRules;
let mockRuleSet;

describe('RuleSet', () => {
    beforeEach(() => {
        mockRuleToAdd = {
            test: /foo/,
            loader: 'mockRuleToAdd',
        };

        mockLoaderRules = {
            oneOf: [
                mockJsRule,
                mockImageRule,
                mockCssRule,
                mockDefaultRule,
            ],
        };

        mockRules = [
            mockJsPreloaderRule,
            mockCssPreloaderRule,
            mockLoaderRules,
        ];
        mockRuleSet = new RuleSet(mockRules);
    });

    describe('matcherMatchesRule', () => {
        it('should normalize rules', () => {
            expect(mockRuleSet.normalizedRules).toBeDefined();
        });
    });

    describe('forEach', () => {
        it('should call action once for each rule', () => {
            const actionSpy = jasmine.createSpy();
            mockRuleSet.forEach(actionSpy);

            // Should be called once for each rule, including the parent rules.
            const expectedCalls = [
                {expectedRule: {rules: mockRules}, expectedParent: undefined},
                {expectedRule: mockJsPreloaderRule, expectedParent: mockRules},
                {expectedRule: mockCssPreloaderRule, expectedParent: mockRules},
                {expectedRule: mockLoaderRules, expectedParent: mockRules},
                {expectedRule: mockJsRule, expectedParent: mockLoaderRules.oneOf},
                {expectedRule: mockImageRule, expectedParent: mockLoaderRules.oneOf},
                {expectedRule: mockCssRule, expectedParent: mockLoaderRules.oneOf},
                {expectedRule: mockDefaultRule, expectedParent: mockLoaderRules.oneOf},
            ];
            expect(actionSpy.calls.count()).toEqual(expectedCalls.length);
            expectedCalls.forEach(({expectedRule, expectedParent}) => {
                expect(actionSpy).toHaveBeenCalledWith(
                    expectedRule,
                    jasmine.any(Object),
                    expectedParent
                );
            });
        });

        it('should stop calling action for "oneOf" rules after a match', () => {
            const actionSpy = jasmine.createSpy();
            actionSpy.and.callFake(rule => rule === mockJsRule);
            mockRuleSet.forEach(actionSpy);

            const expectedCalls = [
                {expectedRule: {rules: mockRules}, expectedParent: undefined},
                {expectedRule: mockJsPreloaderRule, expectedParent: mockRules},
                {expectedRule: mockCssPreloaderRule, expectedParent: mockRules},
                {expectedRule: mockLoaderRules, expectedParent: mockRules},
                {expectedRule: mockJsRule, expectedParent: mockLoaderRules.oneOf},
            ];
            expect(actionSpy.calls.count()).toEqual(expectedCalls.length);
            expectedCalls.forEach(({expectedRule, expectedParent}) => {
                expect(actionSpy).toHaveBeenCalledWith(
                    expectedRule,
                    jasmine.any(Object),
                    expectedParent
                );
            });
        });
    });

    describe('forAll', () => {
        it('should not stop calling action for "oneOf" rules after a match', () => {
            const actionSpy = jasmine.createSpy();
            actionSpy.and.callFake(rule => rule === mockJsRule);
            mockRuleSet.forAll(actionSpy);

            const expectedCalls = [
                {expectedRule: {rules: mockRules}, expectedParent: undefined},
                {expectedRule: mockJsPreloaderRule, expectedParent: mockRules},
                {expectedRule: mockCssPreloaderRule, expectedParent: mockRules},
                {expectedRule: mockLoaderRules, expectedParent: mockRules},
                {expectedRule: mockJsRule, expectedParent: mockLoaderRules.oneOf},
                {expectedRule: mockImageRule, expectedParent: mockLoaderRules.oneOf},
                {expectedRule: mockCssRule, expectedParent: mockLoaderRules.oneOf},
                {expectedRule: mockDefaultRule, expectedParent: mockLoaderRules.oneOf},
            ];
            expect(actionSpy.calls.count()).toEqual(expectedCalls.length);
            expectedCalls.forEach(({expectedRule, expectedParent}) => {
                expect(actionSpy).toHaveBeenCalledWith(
                    expectedRule,
                    jasmine.any(Object),
                    expectedParent
                );
            });
        });
    });

    describe('forMatching', () => {
        it('should only call the given action for rules that match', () => {
            const actionSpy = jasmine.createSpy();
            const mockMatcher = rule => (
                rule === mockJsRule ||
                rule === mockImageRule ||
                rule === mockCssRule
            );
            mockRuleSet.forMatching(mockMatcher, actionSpy);

            const expectedCalls = [
                {expectedRule: mockJsRule, expectedParent: mockLoaderRules.oneOf},
            ];
            expect(actionSpy.calls.count()).toEqual(expectedCalls.length);
            expectedCalls.forEach(({expectedRule, expectedParent}) => {
                expect(actionSpy).toHaveBeenCalledWith(
                    expectedRule,
                    expectedParent
                );
            });
        });
    });

    describe('forAllMatching', () => {
        it('should only action for rules that match', () => {
            const actionSpy = jasmine.createSpy();
            const mockMatcher = rule => (
                rule === mockJsRule ||
                rule === mockImageRule ||
                rule === mockCssRule
            );
            mockRuleSet.forAllMatching(mockMatcher, actionSpy);

            const expectedCalls = [
                {expectedRule: mockJsRule, expectedParent: mockLoaderRules.oneOf},
                {expectedRule: mockImageRule, expectedParent: mockLoaderRules.oneOf},
                {expectedRule: mockCssRule, expectedParent: mockLoaderRules.oneOf},
            ];
            expect(actionSpy.calls.count()).toEqual(expectedCalls.length);
            expectedCalls.forEach(({expectedRule, expectedParent}) => {
                expect(actionSpy).toHaveBeenCalledWith(
                    expectedRule,
                    expectedParent
                );
            });
        });
    });

    describe('filter', () => {
        it('should return a list of rules that match', () => {
            const mockMatcher = rule => (
                rule === mockJsPreloaderRule ||
                rule === mockJsRule ||
                rule === mockImageRule ||
                rule === mockCssRule
            );
            const filterResult = mockRuleSet.filter(mockMatcher);

            expect(filterResult).toEqual([
                mockJsPreloaderRule,
                mockJsRule,
            ]);
        });
    });

    describe('getOneRule', () => {
        it('should return one rule that matches', () => {
            const mockMatcher = rule => (
                rule === mockJsRule ||
                rule === mockImageRule ||
                rule === mockCssRule
            );
            const result = mockRuleSet.getOneRule(mockMatcher);

            expect(result).toEqual(mockJsRule);
        });

        it('should raise an error if no rules match', () => {
            const mockMatcher = () => false;

            expect(() => {
                mockRuleSet.getOneRule(mockMatcher);
            }).toThrow();
        });

        it('should raise an error if more than 1 rule matches', () => {
            const mockMatcher = rule => (
                rule === mockJsPreloaderRule ||
                rule === mockCssPreloaderRule
            );

            expect(() => {
                mockRuleSet.getOneRule({action: mockMatcher});
            }).toThrow();
        });
    });

    describe('insertRuleAfterMatch', () => {
        it('should insert after the matching rule', () => {
            const mockMatcher = rule => (
                rule === mockJsRule
            );

            mockRuleSet.insertRuleAfterMatch(mockMatcher, mockRuleToAdd);

            expect(mockRuleSet.rules).toEqual([
                mockJsPreloaderRule,
                mockCssPreloaderRule,
                {
                    oneOf: [
                        mockJsRule,
                        mockRuleToAdd,
                        mockImageRule,
                        mockCssRule,
                        mockDefaultRule,
                    ],
                },
            ]);
        });
    });

    describe('insertRuleBeforeMatch', () => {
        it('should insert before the matching rule', () => {
            const mockMatcher = rule => (
                rule === mockJsRule
            );

            mockRuleSet.insertRuleBeforeMatch(mockMatcher, mockRuleToAdd);

            expect(mockRuleSet.rules).toEqual([
                mockJsPreloaderRule,
                mockCssPreloaderRule,
                {
                    oneOf: [
                        mockRuleToAdd,
                        mockJsRule,
                        mockImageRule,
                        mockCssRule,
                        mockDefaultRule,
                    ],
                },
            ]);
        });
    });
});
