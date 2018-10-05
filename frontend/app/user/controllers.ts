module kindred {
  'use strict';

  export class UserListCtrl {
    users: Models.User[];
    selection: Models.User[];
    searchContext: {
      groups__name?: string[];
      email__icontains?: string,
      active?: boolean
    };
    search: Searcher;

    private activeOptions = [{
      name: "Active",
      value: true
    }, {
      name: "Inactive",
      value: false
    }];
    roleOptions: {
      name: string;
      value: string;
    }[];

    // @ngInject
    constructor(private kinSearcher: SearcherService,
                private kinUserPerms: UserPermsService,
                private kinUserActionsUi: UserActionsUiService) {
      this.selection = [];

      var levels = kinUserPerms.getAuthLevels();

      this.roleOptions = _.map(levels, level => {
        return {
          name: level.name,
          value: level.name
        };
      });

      this.searchContext = {};

      this.search = kinSearcher.make('user', null, this.searchContext);
      // this.search.expr = {
      //   name: ["active"],
      //   value: true
      // };
    }

    toggleGroup(name: string) {
      var groups = this.searchContext.groups__name;
      var index = _.indexOf(groups, name);
      if (index >= 0) {
        groups.splice(index, 1);
      } else {
        groups.push(name);
      }
    }

    hasGroup(name: string): boolean {
      return _.indexOf(this.searchContext.groups__name, name) >= 0;
    }

    /**
     * Action to deactivate selected users
     */
    deactivate() {
      this.kinUserActionsUi.deactivateUsers(this.selection)
        .then(() => this.search.refresh());
    }
    /**
     * Action to reset password of selected users.
     */
    resetPassword() {
      this.kinUserActionsUi.resetPassword(this.selection)
        .then(() => this.search.refresh());
    }
  }

  export class UserEditCtrl extends BaseEditCtrl<Models.User> {
    public static resourceName = "user";
    currentUser: Models.User;
    levelOptions: { name: string; level: number; }[];

    // @ngInject
    constructor(kinBaseEdit,
                private $uibModal: ng.ui.bootstrap.IModalService,
                private kinSession: SessionService,
                private kinUserPerms: UserPermsService) {
      super(kinBaseEdit);
      this.currentUser = kinSession.user;
    }

    $onInit() {
      super.$onInit();
      this.levelOptions = this.kinUserPerms.getAuthLevels();
    }

    initItem(item) {
      // fill new user with default values
      if (!item.id) {
        item.is_active = true;
        item.groups = [];
      }
      return item;
    }

    private needPassword() {
      return this.item.id === this.currentUser.id &&
        (this.item.password || this.item.email !== this.orig.email);
    }

    beforeSave(user) {
      delete user["loggedIn"];
      return user;
    }

    confirmSave() {
      if (this.needPassword()) {
        return this.$uibModal.open({
          templateUrl: "app/user/edit-password-confirm.html",
          controller: ($scope: any) => {
            $scope.email = this.orig.email;
            $scope.password = "";
          }
        }).result.then(password => {
          this.item.current_password = password;
          return this.save();
        });
      } else {
        return this.save();
      }
    }
  }

  export class UserDetailCtrl extends BaseDetailCtrl<Models.User> {
    public static resourceName = "user";

    limit = 20;
    showLogs: boolean;

    logins: Models.AnyElement[];
    failedLogins: Models.AnyElement[];
    accessLog: Models.AnyElement[];

    // @ngInject
    constructor(kinBaseEdit,
                private kinUserActionsUi: UserActionsUiService,
                private kinSession: SessionService,
                private $scope: ng.IScope) {
      super(kinBaseEdit);
    }

    itemLoaded(item) {
      // fixme: need to centralize permissions logic
      this.showLogs = item.id === this.kinSession.user.id ||
        this.kinSession.user.perms.userEdit;

      if (this.showLogs) {
        this.$scope.$watch(() => this.limit, () => this.getLogs());
      }

      return item;
    }

    private getLogs() {
      var userlogQuery = { username: this.item.email, limit: this.limit };
      var accesslogQuery = { modified_by: this.item.id, limit: this.limit };
      var queries = [
        this.s.Restangular.all("loginlog").getList(userlogQuery).then(logs => {
          return (this.logins = logs);
        }),
        this.s.Restangular.all("failedloginlog").getList(userlogQuery).then(logs => {
          return (this.failedLogins = logs);
        }),
        this.s.Restangular.all("accesslog").getList(accesslogQuery).then(logs => {
          return (this.accessLog = logs);
        })
      ];

      return this.s.$q.all(queries);
    }
  }

  export let UserView: ng.IComponentOptions = {
    template: "<ng-outlet></ng-outlet>",
    $routeConfig: [
      {path: '/', name: 'List', component: 'kinUserListView', useAsDefault: true},
      {path: '/:id/edit', name: 'Edit', component: 'kinUserEditView'},
      {path: '/add', name: 'Add', component: 'kinUserEditView'},
      {path: '/:id', name: 'Detail', component: 'kinUserDetailView'}
    ]
  };

  export let UserListView: ng.IComponentOptions = {
    templateUrl: "app/user/list.html",
    bindings: { $router: "<" },
    controller: UserListCtrl,
    controllerAs: "vm"
  };

  export let UserDetailView: ng.IComponentOptions = {
    templateUrl: "app/user/detail.html",
    bindings: { $router: "<" },
    controller: UserDetailCtrl,
    controllerAs: "vm"
  };

  export let UserEditView: ng.IComponentOptions = {
    templateUrl: "app/user/edit.html",
    bindings: { $router: "<" },
    controller: UserEditCtrl,
    controllerAs: "vm"
  };

  angular.module("kindred.user.controllers", [])
    .component("kinUserView", UserView)
    .component("kinUserListView", UserListView)
    .component("kinUserDetailView", UserDetailView)
    .component("kinUserEditView", UserEditView)
    .controller("UserListCtrl", UserListCtrl)
    .controller("UserEditCtrl", UserEditCtrl)
    .controller("UserDetailCtrl", UserDetailCtrl);
}
