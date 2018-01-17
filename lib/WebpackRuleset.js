const assert = require('assert');
const path = require('path');

const WebpackRuleSet = require('webpack/lib/RuleSet');

/**
Private class, used to match rules. Initialized with a "raw matcher", which can be:

  - An object with `action`, `loader`, or `resource` and optional `loaderType`
    ('pre' or 'post')

  - A function, which will be passed both the rule and webpack "normalized" rule
    and should return true for a matching rule and false for a non-matching rule.

  - A resource path string
        examples:
            "/full/path/to/something.js"
            "src/styles.css"  -  resolved relative to process.cwd()
            ".css"            -  treated as "fake_file.css"

  - A "*-loader" string. If the matcher is a string ending in "-loader", it will
    be matched abainst
*/
class RuleMatcher {
    /**
    @param {object|function|string} rawMatcher to match against
      @property {function} action to validate against
      @property {string} loader name to check against the rules loaders ("*-loader")
      @property {string} loaderType pre|post|loader
      @property {string} resource resource path, resolved relative to process.cwd()
    */
    constructor(rawMatcher) {
        if (typeof rawMatcher === 'object') {
            ['action', 'loader', 'loaderType', 'resource'].forEach(key => {
                if (Object.prototype.hasOwnProperty.call(rawMatcher, key)) {
                    this[key] = rawMatcher[key];
                }
            });
        } else if (typeof rawMatcher === 'function') {
            this.action = rawMatcher;
        } else if (typeof rawMatcher === 'string') {
            if (rawMatcher.endsWith('-loader')) {
                this.loader = rawMatcher;
            } else {
                this.resource = rawMatcher;
            }
        }
    }

    /**
    @param {object} rule to match against
    @param {object} normalizedRule webpack "normalized" version of the rule
    @returns {boolean} match status
    */
    test(rule, normalizedRule) {
        let matches;
        if (this.loaderType && this.loaderType !== (rule.enforce || 'loader')) {
            return false;
        }
        if (matches !== false && this.action) {
            matches = !!this.action(rule, normalizedRule);
        }
        if (matches !== false && this.loader) {
            matches = !!(
                (rule.loader && rule.loader.includes(this.loader)) ||
                (rule.use && rule.use.some(u => u.loader.includes(this.loader)))
            );
        }
        if (matches !== false && this.resource) {
            const resourceName = /^\.[a-zA-Z]{2,4}$/.test(this.resource) ?
                `fake_file_name${this.resource}` :
                this.resource;
            const resourcePath = path.resolve(process.cwd(), resourceName);
            if (normalizedRule.resource) {
                matches = !!normalizedRule.resource(resourcePath);
            }
        }
        return !!matches;
    }

    // Checks for a match, if the rule matches the action is run, and
    // returns the match result, not the acton return value.
    actionable(action) {
        const self = this;
        return (rule, normalizedRule, parent) => {
            const ruleIsAMatch = self.test(rule, normalizedRule);
            if (ruleIsAMatch) {
                action(rule, parent);
            }
            return ruleIsAMatch;
        };
    }
}

function makeRuleMatcher(matcher) {
    return matcher instanceof RuleMatcher ? matcher : new RuleMatcher(matcher);
}

function assertFoundRuleCount(foundRules, expectedCount) {
    const _rules_ = expectedCount === 1 ? 'rule' : 'rules';
    assert.equal(
        foundRules.length, expectedCount,
        `Expected ${expectedCount} ${_rules_} but found ${foundRules.length}!`
    );
}

// This is a slimmed down version of `webpack/lib/RuleSet` for matching config rules.
// The webpack RuleSet class normalizes it's rule set, which means the list of
// loaders returned is not the original rules from config. This class simulates
// what webpack's RuleSet does, but keeps a reference to the original rules
// from config.
// see: https://github.com/webpack/webpack/blob/v3.5.1/lib/RuleSet.js
module.exports = class RuleSet {
    /**
    @param {Object[]} rules `webpackConfig.module.rules`
    */
    constructor(rules) {
        this.rules = [].concat(rules);
        this.normalizedRules = WebpackRuleSet.normalizeRules(rules, {}, '');
    }

    /**
    @param {function} action to call for each matching rule
    */
    forEach(action) {
        this._recurseRules(action, {rules: this.rules}, {rules: this.normalizedRules});
    }

    /**
    @param {function} action to call for each matching rule
    */
    forAll(action) {
        // Return `false` to pretend we didn't match and ensure the action is called
        // for all rules
        this.forEach((...args) => action(...args) && false);
    }

    /**
    @param {RuleMatcher|function|string} matcher to match against
    @param {function} action to call for each matching rule
    */
    forMatching(matcher, action) {
        this.forEach(makeRuleMatcher(matcher).actionable(action));
    }

    /**
    @param {RuleMatcher|function|string} matcher to match against
    @param {function} action to call for each matching rule
    */
    forAllMatching(matcher, action) {
        const actionableMatcher = makeRuleMatcher(matcher).actionable(action);
        // Return `false` to pretend we didn't match and ensure the action is called
        // for all rules
        this.forEach((...args) => actionableMatcher(...args) && false);
    }

    /**
    @param {RuleMatcher|function|string} matcher to match against
    @returns {object[]} filtered rules
    */
    filter(matcher) {
        return this._aggregateMatches('forMatching', matcher);
    }

    /**
    @param {RuleMatcher|function|string} matcher to match against
    @returns {object[]} filtered rules
    */
    filterAll(matcher) {
        return this._aggregateMatches('forAllMatching', matcher);
    }

    /**
    Convenience method, retrieves a single loader rule for a given matcher.
    Raises an AssertionError if it finds more or less than 1 matching rule.

    @param {RuleMatcher|function|string} matcher to match against
    @param {object|function} loaderType loader to match for
    @returns {boolean} match status
    */
    getOneRule(matcher, loaderType) {
        // Create the matcher instance here to set the default `loaderType`
        const _matcher = new RuleMatcher(matcher);
        _matcher.loaderType = loaderType || _matcher.loaderType || 'loader';

        const matchingRules = this.filter(_matcher);

        assertFoundRuleCount(matchingRules, 1);

        return matchingRules[0];
    }

    /**
    @param {RuleMatcher|function|string} matcher to match against
    @param {object|function} insert If a function is given, it will be called with
                                    the matching rule and parent rule.
    */
    insertRuleAfterMatch(matcher, insert) {
        this._insertRule('after', matcher, insert);
    }

    /**
    @param {RuleMatcher|function|string} matcher to match against
    @param {object|function} insert If a function is given, it will be called with
                                    the matching rule and parent rule.
    */
    insertRuleBeforeMatch(matcher, insert) {
        this._insertRule('before', matcher, insert);
    }

    _aggregateMatches(aggregateFn, matcher) {
        const matches = [];
        this[aggregateFn](matcher, rule => {
            matches.push(rule);
        });
        return matches;
    }

    _insertRule(location, matcher, insert) {
        // Gather matching rule/parent
        const matchingRules = [];
        this.forMatching(matcher, (rule, parent) => {
            matchingRules.push({rule, parent});
        });

        assertFoundRuleCount(matchingRules, 1);

        const match = matchingRules[0];
        const matchIndex = match.parent.indexOf(match.rule);
        const insertIndex = location === 'before' ? matchIndex : matchIndex + 1;

        const insertValue = typeof insert === 'function' ?
            insert(match.rule, match.parent) :
            insert;

        matchingRules[0].parent.splice(insertIndex, 0, insertValue);
    }

    _recurseRules(action, rule, normalizedRule, parent) {
        if (action(rule, normalizedRule, parent)) {
            return true;
        }
        if (rule.rules) {
            rule.rules.forEach((childRule, i) => (
                this._recurseRules(action, childRule, normalizedRule.rules[i], rule.rules)
            ));
        }
        if (rule.oneOf) {
            rule.oneOf.some((childRule, i) => (
                this._recurseRules(action, childRule, normalizedRule.oneOf[i], rule.oneOf)
            ));
        }
        return false;
    }
};
