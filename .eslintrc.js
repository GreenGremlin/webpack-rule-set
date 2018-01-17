module.exports = {
    "extends": "airbnb-base",
    "rules": {
        "indent": [2, 4, {                // http://eslint.org/docs/rules/indent
            "SwitchCase": 1,
        }],
        "object-curly-spacing": [2, "never"],  // http://eslint.org/docs/rules/object-curly-spacing
        "comma-dangle": [2, "always-multiline"],    // http://eslint.org/docs/rules/comma-dangle
        "arrow-parens": [2, "as-needed"], // http://eslint.org/docs/rules/arrow-parens
        "no-underscore-dangle": 0,        // http://eslint.org/docs/rules/no-underscore-dangle
    },
};
