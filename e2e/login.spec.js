'use strict';

describe('The login view', function () {
  var page, home;

  beforeEach(function() {
    page = require('./login.po');
    page.get();
  });

  var doLogin = function() {
    browser.driver.sleep(2);
    page.doLogin("rlorrimar@ccg.murdoch.edu.au", "rodney");
  };

  // first test never passes because it can't find angular
  it('should load angular', function() {
    browser.waitForAngular();
  });

  it('should include jumbotron with correct data', function() {
    expect(page.h1El.getText()).toBe('Turtleweb');
    //expect(page.imgEl.getAttribute('src')).toMatch(/assets\/images\/yeoman.png$/);
    //expect(page.imgEl.getAttribute('alt')).toBe('I\'m Yeoman');
  });

  it('should say turtleweb', function() {
    expect(page.h1El.getText()).toBe('Turtleweb');
  });

  it('should login', function() {
    doLogin();
  });

  it('should wait a little while', function() {
    browser.driver.sleep(2);
    browser.waitForAngular();
  });

  it('should show the breadcrumbs', function() {
    doLogin();

    browser.driver.sleep(2);
    home = require('./home.po');

    // breadcrumbs are a little unreliable
    expect(home.breadcrumbs.getText()).toContain('Turtleweb');
  });

  it('should list studies', function() {
    doLogin();

    browser.driver.sleep(2);
    home = require('./home.po');

    expect(home.studies.count()).toBeGreaterThan(1);
  });

});
