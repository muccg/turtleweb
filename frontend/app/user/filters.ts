module kindred {
  'use strict';

  var m = angular.module("kindred.user.filters", []);

  m.filter("accessLogAction", function() {
    var map = {
      C: "Create",
      R: "Read",
      U: "Update",
      D: "Delete"
    };
    return function(c : string) {
      if (c) {
        return map[c.toUpperCase()];
      }
    };
  });
}
