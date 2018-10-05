module kindred {
  'use strict';

  angular.module("kindred.admin", [
    "kindred.admin.ddledit",
    "kindred.admin.controllers"
  ])
    .directive('kinFieldCaseEdit', kinFieldCaseEditDirective);
}
