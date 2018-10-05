module kindred {
  'use strict';

  export interface ResetPasswordOpts {
    users: Models.User[];
    deactivate: boolean;
  }

  export class UserActionsService {
    // @ngInject
    constructor(private $http: ng.IHttpService,
                private $q: ng.IQService) {
    }
    deactivateUsers(users: Models.User[]) {
      return this.$q.all(_.map(users, user => {
        user.is_active = false;
        return user.save();
      }));
    }
    resetPassword(opts: ResetPasswordOpts) {
      return this.$q.all(_.map(opts.users, user => {
        return this.$http.post(user.resource_uri + "/password-reset", {
          deactivate: opts.deactivate
        }).then(_.constant(user));
      }));
    }
  }

  export class UserActionsUiService {
    // @ngInject
    constructor(private $uibModal: ng.ui.bootstrap.IModalService,
                private kinUserActions: UserActionsService) {
    }
    deactivateUsers(users: Models.User[]) {
      return this.kinUserActions.deactivateUsers(users)
        .then(users => {
          return this.$uibModal.open({
            templateUrl: "app/user/deactivate-done.html",
            controller: function($scope) {
              $scope.users = users;
            }
          }).result;
        });
    }
    resetPassword(users: Models.User[]) {
      return this.$uibModal.open({
        templateUrl: "app/user/reset-password.html",
        controller: function($scope) {
          $scope.users = users;
        }
      }).result.then(opts => {
        return this.kinUserActions.resetPassword(opts)
          .then(_.constant(opts));
      }).then(opts => {
        return this.$uibModal.open({
          templateUrl: "app/user/reset-password-done.html",
          controller: function($scope) {
            _.assign($scope, opts);
          }
        }).result;
      });
    }
  }

  // there is a ng-password-strength module which has a better
  // formula, but its implementation sucks. this should be good enough
  // anyway.
  export class PasswordStrengthService {
    isDecent(password: string): boolean {
      return password && password.length >= 8 &&
        !!password.match(/[a-z]/) && !!password.match(/[A-Z]/) &&
        !!password.match(/[0-9]/);
    }
  }

  var m = angular.module("kindred.user.services", [])
    .service("kinUserActions", UserActionsService)
    .service("kinUserActionsUi", UserActionsUiService)
    .service("kinPasswordStrength", PasswordStrengthService);
}
