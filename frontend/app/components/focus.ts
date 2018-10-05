module kindred {
  'use strict';

  // a way of getting the correct form element focussed
  // http://stackoverflow.com/a/18295416/405240
  function focusOnDirective(): ng.IDirective {
    return function(scope, elem, attr) {
      scope.$on('focusOn', function(e, name) {
        if (name === attr.focusOn) {
          elem[0].focus();
        }
      });
    };
  }

  function focusFactory($rootScope: ng.IRootScopeService, $timeout: ng.ITimeoutService) {
    return function(name) {
      $timeout(function() {
        $rootScope.$broadcast('focusOn', name);
      });
    };
  }

  // @ngInject
  function tickFocusDirective($timeout: ng.ITimeoutService): ng.IDirective {
    /*
     * This directive focusses an element given by the selector when
     * the model value changes to something truthy.
     * Best used on checkboxes to select another input after ticking.
     */
    return {
      restrict: 'A',
      scope: {
        selector: '@kinTickFocus'
      },
      require: '^ngModel',
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {
        ngModel.$viewChangeListeners.push(function() {
          if (ngModel.$viewValue) {
            var q = "input,textarea,select"
            var sel = angular.element(scope.selector);
            var el = sel.filter(q)[0] || sel.find(q)[0];
            if (el) {
              $timeout(function() { el.focus(); }, 0);
            }
          }
        });
      }
    };
  }

  // @ngInject
  function autofocusDirective($timeout: ng.ITimeoutService): ng.IDirective {
    /*
     * HTML5 input autofocus attribute doesn't work very well on
     * single page apps. This directive fixes it up.
     */
    return {
      restrict: 'A',
      link: function(scope, elem, attrs) {
        attrs.$observe("autofocus", function(focus) {
          if (!angular.isUndefined(focus)) {
            $timeout(function() {
              elem[0].focus();
            });
          }
        });
      }
    };
  }

  // @ngInject
  function kinAutofocusDirective($timeout: ng.ITimeoutService): ng.IDirective {
    /*
     * Does an autofocus, but also selects all text on the input
     * element.
     */
    return {
      restrict: 'A',
      link: function(scope, elem, attrs) {
        var input = <HTMLInputElement>elem[0];
        $timeout(function() {
          input.focus();
          input.setSelectionRange(0, input.value.length);
        });
      }
    };
  }

  angular.module("kindred.components.focus", [])
    .directive("focusOn", focusOnDirective)
    .directive("kinTickFocus", tickFocusDirective)
    .directive("autofocus", autofocusDirective)
    .directive("kinAutofocus", kinAutofocusDirective)
    .factory("focus", focusFactory);
}
