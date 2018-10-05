/// <reference path="directives.ts" />
/// <reference path="services.ts" />
/// <reference path="filters.ts" />

module kindred {
  'use strict';

  angular.module("kindred.search.autocomplete", [
    "kindred.search.autocomplete.directives",
    "kindred.search.autocomplete.filters"
  ])
    .service("kinQueryAutoCompletePos", QueryAutoCompletePosService);
}
