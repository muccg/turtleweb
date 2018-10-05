module kindred {
  export interface AskConfirmOpts {
    title?: string;
    msg?: string;
    action?: string;
    template?: string;
    size?: string;
  }

  export class ConfirmService {
    public confirming: boolean;

    // @ngInject
    constructor(private $uibModal: ng.ui.bootstrap.IModalService, private $rootScope: ng.IScope) {
    }

    ask(opts: AskConfirmOpts, template?: string, controller?): ng.IPromise<{}> {
      _.defaults(opts, {
        title: "Confirm",
        msg: "Are you sure?",
        action: "OK",
        size: "sm",
        template: template || "delete-confirm"
      });
      var modal = this.$uibModal.open({
        templateUrl: `app/dlg/${opts.template}.html`,
        size: opts.size,
        scope: angular.extend(this.$rootScope.$new(true), opts),
        controller: controller
      });
      this.confirming = true;
      modal.result.then(() => { this.confirming = false; });
      return modal.result;
    }
  }

  export class LockingModalService {
    // @ngInject
    constructor(private $uibModal: ng.ui.bootstrap.IModalService) {
    }

    present(resource_uri: string) {
      var modal = this.$uibModal.open({
        templateUrl: "app/dlg/locking.html",
        // @ngInject
        controller: function($scope, Restangular: restangular.IService) {
          var resource = Restangular.allUrl("versions", resource_uri + "/versions");
          resource.getList({ limit: 1}).then(function(versions) {
            $scope.versions = versions;
            $scope.revision = versions && versions[0] ? versions[0].revision : null;
          });
        }
      });
      return modal.result;
    }
  }

  var m = angular.module('kindred.dlg', [])
    .service('kinConfirm', ConfirmService)
    .service("kinLockingModal", LockingModalService);
}
