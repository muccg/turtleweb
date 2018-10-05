module kindred {
  'use strict';

  // Glyphicon expander <span kin-expandy="open" />
  function expandyDirective(): ng.IDirective {
    return {
      restrict: "A",
      scope: { "open": "<kinExpandy" },
      link: function(scope, elem, attrs) {
        elem.addClass("glyphicon");
        scope.$watch("open", (open: boolean) => {
          elem.toggleClass("glyphicon-expand", !open);
          elem.toggleClass("glyphicon-collapse-down", !!open);
        });
      }
    };
  }

  class ExpandKeyDirectiveCtrl {
    // @ngInject
    constructor() {
    }
  }

  interface ExpandyKeyScope extends ng.IScope {
    key: string;
    expand: boolean;
  }

  // @ngInject
  function toggleExpandKeyDirective(kinExpandState: ExpandStateService): ng.IDirective {
    return {
      restrict: "A",
      scope: {
        key: "=kinToggleExpandKey"
      },
      link: function(scope: ExpandyKeyScope, elem, attrs) {
        elem.click(function(ev) {
          scope.$apply(function() {
            scope.expand = kinExpandState.toggle(scope.key);
          });
        });
      }
    };
  }

  // @ngInject
  function expandyKeyDirective(kinExpandState: ExpandStateService): ng.IDirective {
    return {
      restrict: "A",
      scope: {
        key: "=kinExpandyKey"
      },
      template: '<i class="glyphicon" ng-class="{ \'glyphicon-triangle-bottom\': expand, \'glyphicon-triangle-right\': !expand}"></i>',
      link: function(scope: ExpandyKeyScope, elem, attrs) {
        scope.$watch(() => { return kinExpandState.get(scope.key); },
                     (expand) => { scope.expand = expand; });
      }
    };
  }

  interface ExpandStateMap {
    [index: string]: {
      [index: string]: boolean;
    };
  }

  export class ExpandStateService {
    private state: ExpandStateMap = {}

    // @ngInject
    constructor(private $location: ng.ILocationService) {
    }

    private get stateMap() {
      var key = this.$location.path();
      if (!this.state[key]) {
        this.state[key] = {};
      }
      return this.state[key];
    }

    get(key: string): boolean {
      return this.stateMap[key];
    }

    toggle(key: string): boolean {
      return (this.stateMap[key] = !this.stateMap[key]);
    }
  }

  angular.module("kindred.components.expandy", [])
    .directive('kinExpandy', expandyDirective)
    .directive("kinToggleExpandKey", toggleExpandKeyDirective)
    .directive("kinExpandyKey", expandyKeyDirective)
    .service("kinExpandState", ExpandStateService);
}
