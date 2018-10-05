module kindred {
  'use strict';

  angular.module("kindred.search", [
    "kindred.search.services",
    "kindred.search.parser",
    "kindred.search.directives",
    "kindred.search.autocomplete",
    "kindred.search.idlookup"
  ]);
}
