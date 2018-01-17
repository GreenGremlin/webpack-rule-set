/* eslint-env node, jasmine */
const SpecReporter = require('jasmine-spec-reporter').SpecReporter;

jasmine.getEnv().addReporter(new SpecReporter({spec: {displayPending: true}}));
