module kindred {
  'use strict';

  let kinFieldsEditComponent: ng.IComponentOptions = {
    templateUrl: 'app/custom/fields-edit.html',
    require: {
      ngModel: '?ngModel'
    },
    bindings: {
      fields: '<',
      showOther: '<'
    },
    controllerAs: "vm",
    controller: class {
      // component bindings
      fields: PlainField[];
      showOther: boolean;
      ngModel: ng.INgModelController;

      // instance variables
      d: {};
      otherFields: string[];

      boolOptions = [{
        value: null,
        title: ''
      }, {
        value: true,
        title: 'Yes'
      }, {
        value: false,
        title: 'No'
      }, {
        value: null,
        title: 'Unknown'
      }];

      // @ngInject
      constructor($scope: ng.IScope) {
        $scope.$watch(() => this.d, d => {
          if (this.ngModel) {
            this.ngModel.$setViewValue(d);
          }
        }, true);

        $scope.$watch(() => this.fields, () => this.updateOtherFields());
      }

      $onInit() {
        if (this.ngModel) {
          this.ngModel.$render = () => {
            this.d = this.ngModel.$viewValue || {};
            this.updateOtherFields();
          };
        }
      }

      private updateOtherFields() {
        this.otherFields = findOtherFields(this.fields, this.d);
      }
    }
  };

  // @ngInject
  function kinEventFieldsEditDirective(kinEventTypes: EventTypesService): ng.IDirective {
    return {
      restrict: 'E',
      template: '<kin-fields-edit ng-model="d" fields="fields" show-other="true"></kin-fields-edit>',
      require: '?ngModel',
      scope: {
        eventType: '=',
        patientHasCases: '=?'
      },
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {
        scope.$watch("eventType", (eventType: Models.EventType) => {
          kinEventTypes.load().then(() => {
            var schema = kinEventTypes.getMergedSchema(eventType);
            var cases = <string[]>_(scope.patientHasCases).map("case").map("resource_uri").valueOf();
            scope.fields = kinEventTypes.translateSchema(schema, cases);
          });
        });

        if (!ngModel)
          return;

        ngModel.$render = function() {
          scope.d = ngModel.$viewValue || {};
        };

        scope.$watch("d", function(d) {
          ngModel.$setViewValue(d);
        }, true);
      }
    };
  }

  interface FieldsDirectiveScope extends ng.IScope {
    inputFields: PlainField[];
    fields: PlainField[];
    other_fields: string[];
    dontShow: string[];
    d: {};
  }

  function findOtherFields(fields: PlainField[], data: {}) {
    return _(data).keys().filter(name => !!data[name])
      .difference(_.map(fields, f => f.name)).valueOf();
  }

  // @ngInject
  function kinFieldsDirective(): ng.IDirective {
    return {
      restrict: 'E',
      templateUrl: 'app/custom/fields.html',
      require: '?ngModel',
      scope: {
        inputFields: '<fields',
        dontShow: '<'
      },
      link: function(scope: FieldsDirectiveScope, elem, attrs, ngModel: ng.INgModelController) {
        var updateOtherFields = () => {
          var blacklist = _.zipObject(scope.dontShow, _.map(scope.dontShow, () => true));
          scope.fields = _.filter(scope.inputFields, f => !blacklist[f.name]);
          scope.other_fields = findOtherFields(scope.fields, scope.d);
        };
        scope.$watchCollection(() => [scope.inputFields, scope.dontShow], updateOtherFields);

        if (ngModel) {
          ngModel.$render = function() {
            scope.d = _.omit(ngModel.$viewValue || {}, scope.dontShow);
            updateOtherFields();
          };
        }
      }
    };
  }

  // @ngInject
  function kinEventFieldsDirective(kinEventTypes): ng.IDirective {
    return {
      restrict: 'E',
      template: '<kin-fields ng-model="d" fields="fields"></kin-fields>',
      require: '?ngModel',
      scope: {
        eventType: '=',
        patientHasCases: '=?'
      },
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {

        scope.$watch("eventType", function(eventType) {
          kinEventTypes.load().then(function() {
            var schema = kinEventTypes.getMergedSchema(eventType);
            var cases = _(scope.patientHasCases).map("case").map("resource_uri").valueOf();
            scope.fields = kinEventTypes.translateSchema(schema, cases);
          });
        });

        if (ngModel) {
          ngModel.$render = function() {
            scope.d = ngModel.$viewValue || {};
          };
        }
      }
    };
  }

  // @ngInject
  function kinCustomDataFieldsDirective(kinCustomDataSchema: CustomDataSchemaService, kinEventTypes: EventTypesService): ng.IDirective {
    return {
      restrict: 'E',
      template: '<kin-fields ng-model="d" fields="fields" dont-show="dontShow"></kin-fields>',
      require: '?ngModel',
      scope: {
        resource: '@',
        dontShow: '<'
      },
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {
        scope.$watch("resource", resource => {
          if (resource) {
            kinCustomDataSchema.get(resource).then(cds => {
              scope.fields = kinEventTypes.translateSchema(cds.schema);
            });
          }
        });

        if (ngModel) {
          ngModel.$render = function() {
            scope.d = ngModel.$viewValue || {};
          };
        }
      }
    };
  }

  // @ngInject
  function kinCustomDataEditDirective(kinCustomDataSchema: CustomDataSchemaService, kinEventTypes: EventTypesService): ng.IDirective {
    return {
      restrict: 'E',
      template: '<kin-fields-edit ng-model="d" fields="fields"></kin-fields-edit>',
      require: '?ngModel',
      scope: {
        resource: '@'
      },
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {
        scope.$watch("resource", resource => {
          if (resource) {
            kinCustomDataSchema.get(resource).then(schema => {
              scope.fields = kinEventTypes.translateSchema(schema.schema);
            });
          }
        });

        if (!ngModel)
          return;

        ngModel.$render = function() {
          scope.d = ngModel.$viewValue || {};
        };

        scope.$watch("d", function(d) {
          ngModel.$setViewValue(d);
        }, true);
      }
    };
  }

  // @ngInject
  function fieldResourceDirective(kinDdl: DdlService): ng.IDirective {
    return {
      restrict: 'E',
      require: 'ngModel',
      scope: {
        field: '='
      },
      link: function(scope, elem, attrs, ngModel: ng.INgModelController) {
        function set(text: string, isLoading: boolean) {
          elem.text(text);
          elem.toggleClass("kin-field-resource-loading", !!isLoading);
        }

        function update(field, id) {
          if (field.resource && id) {
            set("Loading...", true);
            kinDdl.getListItem(field.resource, id).then(function(item) {
              set(item.name, false);
            }, function(e) {
              set(id, false);
            });
          } else {
            set("", false);
          }
        }

        ngModel.$render = function() {
          update(scope.field, ngModel.$viewValue);
        };
      }
    };
  }

  let ddlLookupComponent: ng.IComponentOptions = {
    bindings: {
      uri: '<',
      onLoaded: '&'
    },
    template: '<span ng-class="$ctrl.cls">{{ ::$ctrl.item.name }}</span>',
    controller: class {
      uri: string;
      onLoaded: (scope: { item: Models.Any }) => void;
      cls: string;

      item: Models.Any;

      // @ngInject
      constructor($scope: ng.IScope, private kinDdl: DdlService) {
        $scope.$watch("$ctrl.uri", () => this.refresh());
      }

      private refresh() {
        this.cls = "kin-ddl-lookup-loading";
        this.kinDdl.getUri(this.uri).then(item => {
          this.item = item;
          this.cls = null;
          this.onLoaded({ item: item });
        })
      }
    }
  };

  function showParentFieldsDirective(): ng.IDirective {
    return {
      restrict: 'E',
      require: 'ngModel',
      templateUrl: 'app/custom/show-parent-fields.html',
      scope: {},
      controller: class {
        fields: PlainField[];

        // @ngInject
        constructor(private kinEventTypes: EventTypesService) {
        }

        setEventType(val: Models.EventType) {
          this.kinEventTypes.load().then(() => {
            this.fields = this.kinEventTypes.getParentFields(val);
          });
        }
      },
      controllerAs: 'vm',
      link: function(scope, elem, attrs, ngModel: ng.INgModelController) {
        if (ngModel) {
          ngModel.$render = function() {
            scope.vm.setEventType(ngModel.$viewValue);
          };
        }
      }
    };
  }

  interface DDLEntry {
    name: string;
    propName: string;
    id?: number|string;
    isCustom: boolean;
  };

  let listRelatedDdlsComponent: ng.IComponentOptions = {
    templateUrl: "app/custom/list-related-ddls.html",
    bindings: {
      resourceName: "<",
      customSchema: "<schema"
    },
    controller: class {
      resourceName: string;
      customSchema: Models.CustomSchema;

      apiSchema: Models.ApiSchema;
      ddls: DDLEntry[];

      // @ngInject
      constructor(private $q: ng.IQService,
                  private kinCustomDataSchema: CustomDataSchemaService,
                  private kinDdlList: DdlListService,
                  private kinSchema: SchemaService) {
      }

      $onChanges(changesObj) {
        this.schemaChanged();
      }

      $onInit() {
        this.schemaChanged();
      }

      private schemaChanged() {
        this.$q.all([
          this.kinDdlList.getLists(),
          this.resourceName ?
            this.kinSchema.get(this.resourceName).then(schema => {
              this.apiSchema = schema;
            }) : null
        ]).then(() => this.rebuild());
      }

      private rebuild() {
        var convertCustom = (prop: { resource: string; type: string; }, name: string): DDLEntry => {
          if (prop && prop.type === "resourceId") {
            var list = this.kinDdlList.getListInfo(prop.resource);
            if (list) {
              return {
                name: list.list.name,
                propName: name,
                id: list.id,
                isCustom: typeof list.id === "number"
              };
            }
          }
        }

        var convertApi = (prop, name): DDLEntry => {
          if (prop.type === "related" && prop.related_resource) {
            var list = this.kinDdlList.getListInfo(prop.related_resource);
            if (list) {
              return {
                name: list.list.name,
                propName: name,
                id: list.id,
                isCustom: false
              };
            }
          }
        }

        var custom: DDLEntry[] = this.customSchema ?
          <any>_.map(this.customSchema.properties, convertCustom) : [];
        var api: DDLEntry[] = this.apiSchema ?
          _.map(this.apiSchema.fields, convertApi) : [];

        this.ddls = _([custom, api])
          .flatten<DDLEntry>()
          .filter(_.identity)
          .uniqBy("name").valueOf();
      }
    },
    controllerAs: "vm"
  };

  /**
   * To be used with <input type="number" ng-model="var"> when the
   * model value might accidentally be a string.
   */
  function coerceNumberDirective(): ng.IDirective {
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ngModel: ng.INgModelController) {
        ngModel.$formatters.push(value => {
          if (typeof value === "string") {
            value = parseFloat(value);
            if (_.isNaN(value)) {
              value = undefined;
            }
          }
          return value;
        });
      }
    };
  }

  angular.module("kindred.custom.directives", [])
    .component('kinFieldsEdit', kinFieldsEditComponent)
    .directive('kinFields', kinFieldsDirective)
    .directive('kinEventFieldsEdit', kinEventFieldsEditDirective)
    .directive('kinEventFields', kinEventFieldsDirective)
    .directive('kinCustomDataFields', kinCustomDataFieldsDirective)
    .directive('kinCustomDataEdit', kinCustomDataEditDirective)
    .directive('kinFieldResource', fieldResourceDirective)
    .component('kinDdlLookup', ddlLookupComponent)
    .directive('kinShowParentFields', showParentFieldsDirective)
    .component('kinListRelatedDdls', listRelatedDdlsComponent)
    .directive('kinCoerceNumber', coerceNumberDirective);
}
