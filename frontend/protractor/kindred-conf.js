exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['kindred-test.js'],
  capabilities: { 'browserName': 'firefox' },
  allScriptsTimeout: 500000,
  onPrepare: function() {
    require('/usr/lib/node_modules/jasmine-reporters');
    jasmine.getEnv().addReporter(
      new jasmine.JUnitXmlReporter(
        '/tmp', // savePath
        true, // consolidate
        true, // useDotNotation
        'protractor-kindred', // filePrefix
        true)); // consolidateAll
    require('protractor-linkuisref-locator')(protractor);
  }
};
