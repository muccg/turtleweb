/// <reference path="../crud/controllers.ts" />

module kindred {
  'use strict';

  export class DdlListCtrl {
    public lists: any;

    // @ngInject
    constructor(kinDdlList: DdlListService) {
      this.lists = kinDdlList.getLists().$object;
    }
  }


  export class DdlEditCtrl extends BaseEditCtrl<Models.AnyElement> {
    public ddlEdit: DdlEditDirectiveCtrl;
    public items: Models.AbstractNameList[];
    public endpoint: string;

    // @ngInject
    constructor(kinBaseEdit, private $http: ng.IHttpService, private appConfig: AppConfig) {
      super(kinBaseEdit);
    }

    protected getItem(params: {}) {
      this.endpoint = params["endpoint"];
      var url = this.appConfig.api_base + this.endpoint + "/schema";
      return this.s.$q.all({
        items: this.s.Restangular.all(this.endpoint).getList({ limit: 0 }),
        schema: this.$http.get(url).then(_.property("data"))
      }).then((result: any) => {
        this.items = result.items;
        return result.schema;
      });
    }

    isClean() {
      return !this.ddlEdit || this.ddlEdit.isClean();
    }

    save() {
      var action = this.ddlEdit.save().then(() => this.item)
      return this.s.kinSaving.monitor(action);
    }
  }

  export class CustomDdlEditCtrl extends BaseEditCtrl<Models.CustomDropDownList> {
    static resourceName = "ddl";
    public ddlEdit: DdlEditDirectiveCtrl;

    public items: any[];

    // @ngInject
    constructor(kinBaseEdit: BaseEditService<Models.CustomDropDownList>) {
      super(kinBaseEdit);
    }

    protected getItem(params: {}) {
      return this.s.$q.all({
        list: super.getItem(params),
        items: this.getListItems(params)
      }).then((result: any) => {
        this.items = result.items;
        return result.list
      });
    }

    private getListItems(params: {}): ng.IPromise<any> {
      if (params.hasOwnProperty("id")) {
        return this.s.kinDdl.get(params["id"]);
      } else {
        return this.s.$q.resolve(this.s.Restangular.restangularizeCollection(null, [], "ddv"));
      }
    }

    protected afterSave(list) {
      _.each(this.ddlEdit.items, item => {
        item["list"] = list.resource_uri;
      });
      return this.ddlEdit.save().then(() => list);
    }

    private forceClean: boolean;
    protected redirectRoute(item) {
      this.forceClean = true;
      return ['EditCustom', { id: item.id, name: item.name }];
    }

    isClean() {
      return this.forceClean || (super.isClean() && (!this.ddlEdit || this.ddlEdit.isClean()));
    }
  }

  export class FieldsEditCtrl extends BaseEditCtrl<Models.AnyElement> {
    schema: Models.ApiSchema;
    endpoint: string;
    patientCases: Models.PatientCase[];

    // @ngInject
    constructor(kinBaseEdit, private $http: ng.IHttpService,
                private appConfig: AppConfig) {
      super(kinBaseEdit);
    }

    protected getItem(params: {}) {
      this.endpoint = params["endpoint"];
      return this.s.$q.all({
        item: this.s.getItem(params["endpoint"], params),
        schema: this.getSchema(params)
      }).then((result: any) => {
        this.schema = result.schema;
        return result.item
      });
    }

    private getSchema(params: {}) {
      var url = this.appConfig.api_base + params["endpoint"] + "/schema";
      return this.$http.get(url).then(_.property("data"));
    }

    protected getMoreDeps(item) {
      this.patientCases = this.s.kinDdl.get<Models.PatientCase>("patientcase").$object;
      return item;
    }

    protected initItem(item) {
      var emptyFields = {
        type: "object",
        properties: {},
        title: this.schema.model.verbose_name,
        caseHiding: {}
      };

      if (_.isEmpty(item.fields)) {
        item.fields = angular.copy(emptyFields);
      }

      return item;
    }

    protected redirectRoute(item) {
      return ["..", "..", "Ddl", "Edit", {endpoint: this.endpoint }];
    }
  }

  export class AdminHomeCtrl {
    u: RouteUtilService;
    customSchema: Models.CustomDataSchema[];

    // @ngInject
    constructor(private kinCustomDataSchema: CustomDataSchemaService,
                public kinSession: SessionService,
                public appConfig: AppConfig,
                kinRouteUtil: RouteUtilService) {
      this.u = kinRouteUtil;
    }

    $routerOnActivate() {
      return this.kinCustomDataSchema.all().then(customSchema => {
        this.customSchema = customSchema;
      });
    }
  }

  export class CustomDataSchemaEditCtrl extends BaseEditCtrl<Models.CustomDataSchema> {
    public resource: string;

    // @ngInject
    constructor(kinBaseEdit,
                private kinCustomDataSchema: CustomDataSchemaService) {
      super(kinBaseEdit);
    }

    protected getItem(params: {}) {
      this.resource = params["resource"];
      return this.kinCustomDataSchema.get(this.resource);
    }

    protected beforeSave(copy) {
      if (copy.content_type && copy.content_type.resource_uri) {
        copy.content_type = <any>copy.content_type.resource_uri;
      }
      return copy;
    }

    protected afterSave(updated) {
      return this.kinCustomDataSchema.refresh()
        .then(cds => {
          return _.find(cds, {id: updated.id}) || updated;
        });
    }

    protected redirectRoute(item) {
      //return ["..", "..", "AdminHome"];
      return null;
    }
  }

  export let AdminView: ng.IComponentOptions = {
    templateUrl: "app/admin/admin.html",
    controller: AdminHomeCtrl,
    controllerAs: 'vm',
    $routeConfig: [
      {path: '/ddl/...', name: 'Ddl', component: 'kinAdminDdlView'},
      {path: '/schema/...', name: 'Schema', component: 'kinAdminSchemaView'},
      {path: '/fields/...', name: 'Fields', component: 'kinAdminFieldsView'},
      {path: '/users/...', name: 'User', component: 'kinUserView'},
      {path: '/', name: 'AdminHome', component: 'kinAdminHomeView', useAsDefault: true}
    ]
  };

  export let AdminHomeView: ng.IComponentOptions = {
    template: ''
  };

  export let AdminDdlView: ng.IComponentOptions = {
    template: '<ng-outlet></ng-outlet>',
    $routeConfig: [
      {path: '/list', name: 'List', component: 'kinAdminDdlListView', useAsDefault: true},
      {path: '/:id/:name/edit', name: 'EditCustom', component: 'kinAdminDdlEditCustomView'},
      {path: '/:endpoint/edit', name: 'Edit', component: 'kinAdminDdlEditView'},
      {path: '/add', name: 'AddCustom', component: 'kinAdminDdlEditCustomView'}
    ]
  };

  export let AdminDdlListView: ng.IComponentOptions = {
    templateUrl: "app/admin/ddl/list.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: "DdlListCtrl"
  };

  export let AdminDdlEditCustomView: ng.IComponentOptions = {
    templateUrl: "app/admin/ddl/edit-custom.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: "CustomDdlEditCtrl"
  };

  export let AdminDdlEditView: ng.IComponentOptions = {
    templateUrl: "app/admin/ddl/edit.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: "DdlEditCtrl"
  };

  export let AdminSchemaView: ng.IComponentOptions = {
    template: '<ng-outlet></ng-outlet>',
    bindings: { $router: "<" },
    $routeConfig: [
      {path: '/:resource/edit', name: 'Edit', component: 'kinAdminSchemaEditView'}
    ]
  };

  export let AdminSchemaEditView: ng.IComponentOptions = {
    templateUrl: "app/custom/customdataschema-edit.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: "CustomDataSchemaEditCtrl"
  };

  export let AdminFieldsView: ng.IComponentOptions = {
    template: '<ng-outlet></ng-outlet>',
    bindings: { $router: "<" },
    $routeConfig: [
      {path: '/:endpoint/:id/edit', name: 'Edit', component: 'kinAdminFieldsEditView'}
    ]
  };

  export let AdminFieldsEditView: ng.IComponentOptions = {
    templateUrl: "app/admin/fields/edit.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: "FieldsEditCtrl"
  };

  angular.module("kindred.admin.controllers", [
    "kindred.crud.controllers"
  ])
    .component("kinAdminView", AdminView)
    .component("kinAdminHomeView", AdminHomeView)
    .component("kinAdminDdlView", AdminDdlView)
    .component("kinAdminDdlListView", AdminDdlListView)
    .component("kinAdminDdlEditView", AdminDdlEditView)
    .component("kinAdminDdlEditCustomView", AdminDdlEditCustomView)
    .component("kinAdminSchemaView", AdminSchemaView)
    .component("kinAdminSchemaEditView", AdminSchemaEditView)
    .component("kinAdminFieldsView", AdminFieldsView)
    .component("kinAdminFieldsEditView", AdminFieldsEditView)
    .controller("AdminHomeCtrl", AdminHomeCtrl)
    .controller("DdlListCtrl", DdlListCtrl)
    .controller("DdlEditCtrl", DdlEditCtrl)
    .controller("CustomDdlEditCtrl", CustomDdlEditCtrl)
    .controller("FieldsEditCtrl", FieldsEditCtrl)
    .controller("CustomDataSchemaEditCtrl", CustomDataSchemaEditCtrl);
}
