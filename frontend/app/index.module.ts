/// <reference path="../typings/tsd.d.ts" />

/// <reference path="index.route.ts" />
/// <reference path="index.config.ts" />
/// <reference path="index.run.ts" />

declare var moment: moment.MomentStatic;

/*
 * The app entry point.
 * First thing to do is grab a json snippet with essential config
 * information. Then fire up angularjs.
 */
function main(configUrl) {
  var appModules = ['kindred'];

  $.get(configUrl).then(function(config) {
    angular.module("kindred.config", [])
      .constant('appConfig', config || {})
      .constant('appLoadingTimeout', loadingTimeout);

    angular.element(document).ready(function() {
      angular.bootstrap(document, appModules);
    });
  });

  var loadingTimeout = (function(timeout) {
    // if angularjs hasn't started within 30 seconds,
    // then something has probably gone wrong...
    return {
      timer: window.setTimeout(function() {
        var elem = <HTMLElement>document.getElementsByClassName("app-loading")[0];
        if (elem) {
          elem.innerHTML = "An error has occurred.";
        }
      }, timeout * 1000),
      clear: function() {
        if (this.timer) {
          window.clearTimeout(this.timer);
        }
        this.timer = null;
      }
    };
  })(30);
}

module kindred {
  'use strict';

  angular.module('kindred', [
    'ngAnimate',
    'ngCookies',
    'ngComponentRouter',
    'ngSanitize',
    'ngTouch',
    'ui.bootstrap',
    'restangular',
    'kindred.admin',
    'kindred.components',
    'kindred.config',
    'kindred.controllers',
    'kindred.crud',
    'kindred.custom',
    'kindred.directives',
    'kindred.docs',
    'kindred.event',
    'kindred.filters',
    'kindred.import',
    'kindred.page',
    'kindred.patient',
    'kindred.report',
    'kindred.route',
    'kindred.sample',
    'kindred.savedsearch',
    'kindred.search',
    'kindred.services',
    'kindred.study',
    'kindred.studygroup',
    'kindred.test',
    'kindred.user',
    'kindred.usersession'
  ])
    .constant('moment', moment)
    .config(Config)
    .config(ConfigHttp)

    .config(setupUISelectConfig)

    .run(RunBlock)
    .run(RunBlockRootScope)
    .run(RunBlockLoadingTimeout)
    .run(RunBlockServiceDebug)
    .run(RunBlockErrorHandler);
}

main("views/config.json");
