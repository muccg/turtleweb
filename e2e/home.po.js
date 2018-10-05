'use strict';

var HomePage = function() {
  this.breadcrumbs = element(by.css(".navbar-breadcrumbs"));

  // this.studies = element(by.css("kin-study-menu")).all(by.repeater('study in studies'));
  this.studies = element(by.css("kin-study-menu")).all(by.css(".thumbnail-study"));
};

module.exports = new HomePage();
