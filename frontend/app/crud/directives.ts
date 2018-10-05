module kindred {
  'use strict';

  // @ngInject
  function uniqueDirective(): ng.IDirective {
    return {
      scope: {
        item: "=kinUnique",
        field: "@kinUniqueField"
      },
      bindToController: true,
      restrict: 'A',
      require: "ngModel",
      controller: class {
        item: any;
        field: string;

        // @ngInject
        constructor(private kinCheckUnique: CheckUniqueService) {
        }

        checkUnique(value: string): ng.IPromise<boolean> {
          return this.kinCheckUnique.check(this.item, this.field, value);
        }
      },
      controllerAs: 'vm',
      link: function(scope: any, elm, attrs, ngModel: ng.INgModelController) {
        ngModel.$asyncValidators["unique"] = (modelValue, viewValue) => {
          return scope.vm.checkUnique(modelValue || viewValue);
        };
      }
    };
  }

  angular.module("kindred.crud.directives", [])
    .directive("kinUnique", uniqueDirective);
}
