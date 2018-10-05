'use strict';

var paths = {
  e2e: "e2e"
};

var env = {
  baseUrl: "http://localhost:3000",
  //seleniumAddress: 'http://localhost:4444/wd/hub',
  capabilities: {
    "browserName": "chrome",
    "chromeOptions": process.env.CHROME ? {
      binary: process.env.CHROME
    } : undefined
  }
};

// An example configuration file.
exports.config = {
  // The address of a running selenium server.
  seleniumAddress: env.seleniumAddress,

  // Capabilities to be passed to the webdriver instance.
  capabilities: env.capabilities,

  baseUrl: env.baseUrl + '?protractor-test',

  // Spec patterns are relative to the current working directly when
  // protractor is called.
  specs: [paths.e2e + '/**/*.js'],

  rootElement: 'html',
  framework: 'jasmine2',

  // onPrepare: function() {
  //   "use strict";
  //   // wait until login page is visible
  //   browser.driver.get(env.baseUrl + '?protractor-test');
  //   browser.driver.wait(function() {
  //     return browser.driver.getCurrentUrl().then(function(url) {
  //       console.log("url is " + url);
  //       return /login$/.test(url);
  //     });
  //   });
  // },

  seleniumServerJar: process.env.SELENIUM_JAR,
  chromeDriver: process.env.CHROMEDRIVER,

  // Options to be passed to Jasmine-node.
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000
  }
};
