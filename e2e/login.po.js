/**
 * This file uses the Page Object pattern to define the main page for tests
 * https://angular.github.io/protractor/#/page-objects
 */

'use strict';

var LoginPage = function() {
  this.noteEl = element(by.css('.login-note'));
  this.h1El = element(by.css('h1'));

  this.emailEl = element(by.css("input[name='email']"));
  this.passwordEl = element(by.css("input[name='password']"));
  this.tokenEl = element(by.css("input[type='number']"));
  this.buttonEl = element(by.css("button[type='submit']"));

  this.get = function() {
    // This is a manual bootstrap app, which protractor can't handle.
    // https://angular.github.io/protractor/#/system-setup
    var baseUrl = browser.baseUrl.replace(/\?.*/, "");
    //console.log("baseUrl is " + browser.baseUrl);
    return browser.driver.get(baseUrl + '/');
  };

  this.doLogin = function(email, password) {
    this.emailEl.sendKeys(email);
    this.passwordEl.sendKeys(password);
    return this.buttonEl.click();
  };

  //this.emailEl = element(by.input('login.email'));
  //this.passwordEl = element(by.input('login.password'));
  //this.imgEl = this.jumbEl.element(by.css('img'));
  //this.thumbnailEls = element(by.css('body')).all(by.repeater('awesomeThing in main.awesomeThings'));

  // this.userName = element(by.input('login.userName'));
  // this.password = element(by.input('login.password'));
  // this.loginButton = element(by.css('Button[ng-click^="login"]'));
  // this.logoutButton = element(by.css('Button[ng-click^="logout"]'));
  // this.registerButton = element(by.css('Button[ng-click^="register"]'));
  // this.greeting = element(by.binding("Welcome, {{currentBrewer.FirstName}}"));
  // this.gravatarImage = element(by.tagName('img'));
};

module.exports = new LoginPage();
