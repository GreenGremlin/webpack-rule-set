# WebpackRuleset

WebpackRuleset is a slimmed down version of `webpack/lib/RuleSet` for matching, modifying, and inserting rules in webpack config. [Webpack's included RuleSet class][webpacks-rule-set] normalizes it's rule set, which means the list of loaders returned is not the original rules from config. This class simulates what Webpack's RuleSet does, but keeps a reference to the original rules from config. This allows WebpackRuleset to be used to mutate a Webpack config in place.

[webpacks-rule-set]: https://github.com/webpack/webpack/blob/v3.5.1/lib/RuleSet.js

## Installation

```
npm install webpack-ruleset
```

A Webpack config rule can include a child lists of rules as either `rules` or `oneOf` attributes. WebpackRuleset will iterate over child rules simmilar to how Webpack iterates over rules when processing an imported resource.


## Usage

### `WebpackRuleset.forEach(action)`

Iterates over all rules in the rule set. For `oneOf` child rules, iteration continues until `action` returns a truthy value.

**Update a rule based on a filename that the rule would match.**

``` javascript
const WebpackRuleset = require('webpack-ruleset');

const ruleSet = new WebpackRuleset(webpackConfig.module.rules);

ruleSet.forEach(rule => {
    if (rule.loader.includes('babel-loader')) {
        rule.options.babelrc = true;
        return true;
    }
    return false;
});
```


### `WebpackRuleset.forAll(action)`

Iterates over all rules in the rule set. For `oneOf` child rules, iteration continues regardless of what value `action` returns.

``` javascript
const ruleSet = new WebpackRuleset(webpackConfig.module.rules);
const HASHED_NAME_RE = /\.?\-?\[(chunk|content)?hash(:\d*)?\]/;

ruleSet.forAll(rule => {
    if (rule.options && rule.options.name && HASHED_NAME_RE.test(rule.options.name)) {
        rule.options.name = formatPath(rule.options.name);
    }
});
```

## Matcher methods

WebpackRuleset also includes a number of matcher methods. Matcher methods take a matcher as their first argument.

The `matcher` argument can be any of the following:

- A function, which will be passed both the rule and [Webpack "normalized" rule][webpack-normalize-rule] and should return true for a matching rule and false for a non-matching rule.

[webpack-normalize-rule]: https://github.com/webpack/webpack/blob/v3.5.1/lib/RuleSet.js#L95

``` javascript
function matcher(rule, normalizedRule) {
    return normalizedRule.resource && normalizedRule.resource('any.css');
}
```

- A resource path string to test rules against.
    examples:
        "/full/path/to/something.js"
        "src/styles.css"  -  resolved relative to process.cwd()
        ".css"            -  treated as "fake_file.css"

``` javascript
const matcher = '.css';
```

- A string suffexed with "-loader". If the matcher is a string ending in "-loader", it will be matched against

``` javascript
const matcher = 'babel-loader';
```

- An object with `action`, `loader`, or `resource` and optional `loaderType` ('pre' or 'post') attributes. Specifying a matcher as an object allows you to specify wether you want to match pre or post loaders.

``` javascript
const action = '.js' // Matches loaders that would match files with the .js extension
const action = {     // Matches pre-loaders that would match files with the .js extension
    loaderType: 'pre',
    resource: '.js',
}
```


### `WebpackRuleset.forMatching(matcher, action)`

Locate and execute the action on the first matching rule.

Iterates over all rules in the rule set. For `oneOf` child rules, iteration continues until the matcher matches a rule.

**Update a rule based on a filename that the rule would match.**

``` javascript
const ruleSet = new WebpackRuleset(webpackConfig.module.rules);

ruleSet.forMatching('.js', jsRule => {
    jsRule.options.babelrc = true;
});
```

**Update a rule based on the loader name.**

``` javascript
const ruleSet = new WebpackRuleset(webpackConfig.module.rules);

ruleSet.forMatching('css-loader', cssRule => {
    cssRule.options.modules = true;
});
```


### `WebpackRuleset.forAllMatching(matcher, action)`

Locate and execute the action on all rules that match.

Iterates over all rules in the rule set. For `oneOf` child rules, iteration continues, even after the matcher matches a rule.

When a `oneOf` list of rules is encountered, `forMatching` will call the given action on all matching rules in the `oneOf` list.

``` javascript
const ruleSet = new WebpackRuleset(webpackConfig.module.rules);
const rulesWithHashedNames = r => r.options && r.options.name && isHashedName(r.options.name);

ruleSet.forAllMatching(rulesWithHashedNames, rule => {
    rule.options.name = formatPath(rule.options.name);
});
```


### `WebpackRuleset.filter(matcher)`

Gathers matching rules into a flat array.

Iterates over all rules in the rule set. For `oneOf` child rules, iteration continues until the matcher matches a rule.

``` javascript
const ruleSet = new WebpackRuleset(webpackConfig.module.rules);

const cssLoaders = ruleSet.filter('.css');
```


### `WebpackRuleset.filterAll(matcher)`

Gathers matching rules into a flat array.

Iterates over all rules in the rule set. For `oneOf` child rules, iteration continues, even after the matcher matches a rule.

``` javascript
const ruleSet = new WebpackRuleset(webpackConfig.module.rules);

const cssLoaders = ruleSet.filterAll('.css');
```


### `WebpackRuleset.getOneRule(matcher)`

Locate a matching rule. Asserts that only one rule matches.

``` javascript
const ruleSet = new WebpackRuleset(webpackConfig.module.rules);

const jsRule = ruleSet.getOneRule('.js');
jsRule.options.babelrc = true;
```


### `WebpackRuleset.insertRuleBeforeMatch(matcher, insert)`

Inserts a new rule before the matching rule. Asserts that only one matching rule is found.

Accepts either a rule object or a function as the second argument. If the `insert` argument is a function it is called with the matching rule and the parent of the matching rule as parents, otherwise it is inserted as the new rule.

``` javascript
function addCssModuleOption(loader) {
    if (loader.loader && /css\-loader/.test(loader.loader)) {
        return {...loader, options: {...loader.options, modules: true}};
    }
    return loader;
}

const ruleSet = new WebpackRuleset(webpackConfig.module.rules);

// Given a rule set containing a standard css loader, add a css modules rule, with
// css files suffixed with ".global.css" falling through to the existing, non-modules
// css loader.
ruleSet.insertRuleBeforeMatch('.css', globalCssRule => {
    return Object.assign({},
        globalCssRule,
        {
            loader: globalCssRule.loader && globalCssRule.loader.map(addCssModuleOption),
            use: globalCssRule.use && globalCssRule.use.map(addCssModuleOption),
            include: paths.appSrc,
            exclude: /\.global\.css$/,
        }
    );
});
```


### `WebpackRuleset.insertRuleAfterMatch(matcher, insert)`

Same as `insertRuleBeforeMatch`, except that the new rule is inserted after the matching rule.
