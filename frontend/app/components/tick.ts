module kindred {
  'use strict';

  interface TickButtonScope extends ng.IScope {
    val: boolean;
    cls: string;
    tickOn: boolean;
    tickOff: boolean;
  }

  function tickButtonDirective() {
    return {
      restrict: 'E',
      scope: {
        cls: '@class',
        tickOn: '=?',
        tickOff: '=?'
      },
      require: '?ngModel',
      templateUrl: 'app/components/tick/tick-button.html',
      link: function(scope: TickButtonScope, elem, attrs, ngModel: ng.INgModelController) {
        if (ngModel) {
          ngModel.$render = function() {
            scope.val = ngModel.$viewValue;
          };
        }

        scope.$watch('val', function(val) {
          if (ngModel) {
            ngModel.$setViewValue(val);
          }
        });

        var defaults = function() {
          if (!scope.cls) {
            scope.cls = "btn btn-link";
          }
          if (angular.isUndefined(scope.tickOn)) {
            scope.tickOn = true;
          }
          if (angular.isUndefined(scope.tickOff)) {
            scope.tickOff = false;
          }
        };

        scope.$watch("cls", defaults);
        scope.$watch("tickOn", defaults);
        scope.$watch("tickOff", defaults);
        defaults();
      }
    };
  }

  interface TickButtonInvertScope extends ng.IScope {
    cls: string;
    val: boolean;
  }

  function tickButtonInvertDirective() {
    return {
      restrict: 'E',
      scope: {
        cls: '@class'
      },
      require: '?ngModel',
      templateUrl: 'app/components/tick/tick-button.html',
      link: function(scope: TickButtonInvertScope, elem, attrs, ngModel: ng.INgModelController) {
        if (ngModel) {
          ngModel.$render = function() {
            scope.val = !ngModel.$viewValue;
          };
        }

        scope.$watch('val', function(val) {
          if (ngModel) {
            ngModel.$setViewValue(!val);
          }
        });

        scope.$watch("cls", function(cls) {
          if (!cls) {
            scope.cls = "btn btn-link";
          }
        });
      }
    };
  }

  interface YesNoButtonScope extends ng.IScope {
    val: boolean;
  }

  function yesNoButtonDirective() {
    return {
      restrict: 'E',
      scope: {},
      require: '?ngModel',
      templateUrl: 'app/components/tick/yes-no-button.html',
      link: function(scope: YesNoButtonScope, elem, attrs, ngModel: ng.INgModelController) {
        if (ngModel) {
          ngModel.$render = function() {
            scope.val = ngModel.$viewValue;
          };
        }

        scope.$watch('val', function(val) {
          if (ngModel) {
            ngModel.$setViewValue(val);
          }
        });
      }
    };
  }

  angular.module("kindred.components.tick", [])
    .directive('kinTickButton', tickButtonDirective)
    .directive('kinTickButtonInvert', tickButtonInvertDirective)
    .directive('kinYesNoButton', yesNoButtonDirective);
}
