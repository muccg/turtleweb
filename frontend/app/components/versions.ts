module kindred {
  'use strict';

  class VersionsDropdownCtrl {
    form: ng.IFormController;
    item: Models.AnyElement;
    promise: ng.IPromise<Models.Version[]>;
    versions: Models.Version[];

    isOpen: boolean;

    // @ngInject
    constructor(Restangular: restangular.IService) {
    }

    uiFetchVersions() {
      if (this.item.id && this.isOpen) {
        this.fetchVersions();
      }
    }

    private fetchVersions() {
      if (!this.promise) {
        var limit = { limit: 20 };
        this.promise = this.item.all("versions")
          .getList(limit).then(versions => {
            this.versions = versions;
            return versions;
          }, () => {
            this.versions = [];
            this.promise = null;
            return this.versions;
          });
      }
      return this.promise;
    }

    loadVersion(version: Models.Version) {
      version.get().then(version => {
        var plainVersion = version.plain();
        var same = angular.equals(this.item.plain(), plainVersion);
        _.assign(this.item, plainVersion);

        // mark the form as dirty if something changes
        if (this.form && !same) {
          this.form.$setDirty();
        }
      });
    }
  }

  function versionsDropdownDirective(): ng.IDirective {
    return {
      restrict: "E",
      scope: {
        item: "="
      },
      controller: VersionsDropdownCtrl,
      controllerAs: "vm",
      bindToController: true,
      require: ["kinVersionsDropdown", "?^form"],
      templateUrl: "app/components/versions/dropdown.html",
      link: function(scope, elem, attrs, [ctrl, formCtrl]: [VersionsDropdownCtrl, ng.IFormController]) {
        ctrl.form = formCtrl;

        var resizeMenu = () => {
          // fix menu size so that it lines up with the button and
          // won't overflow out of the window
          elem.find(".dropdown-menu")
            .width(elem.find("button").outerWidth());
        }

        scope.$watch(() => {
          return {
            itemId: ctrl.item.id,
            isOpen: ctrl.isOpen
          };
        }, st => {
          ctrl.uiFetchVersions();
          if (st.isOpen) {
            resizeMenu();
          }
        }, true);
      }
    };
  }

  angular.module("kindred.components.versions", [])
    .directive("kinVersionsDropdown", versionsDropdownDirective);
}
