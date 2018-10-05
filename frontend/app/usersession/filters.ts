module kindred {
  'use strict';

  /**
   * Get text version of a user's permission level.
   */
  // @ngInject
  function userLevelFilter(kinUserPerms: UserPermsService) {
    return function(user) {
      if (user) {
        return kinUserPerms.getUserLevel(user);
      }
    };
  }

  /**
   * Shorten email address, useful in narrow browser windows.
   */
  function shortEmailFilter() {
    return function(email) {
      if (email) {
        return email.replace(/@.*/, "");
      }
    };
  }

  angular.module("kindred.usersession.filters", [])
    .filter('userLevel', userLevelFilter)
    .filter("shortEmail", shortEmailFilter);
}
