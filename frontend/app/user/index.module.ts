/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="controllers.ts" />
/// <reference path="directives.ts" />
/// <reference path="filters.ts" />
/// <reference path="services.ts" />

module kindred {
  'use strict';

  angular.module("kindred.user", [
    "kindred.user.controllers",
    "kindred.user.directives",
    "kindred.user.filters",
    "kindred.user.services"
  ]);
}
