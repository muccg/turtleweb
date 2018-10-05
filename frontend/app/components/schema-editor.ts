module kindred {
  'use strict';

  function getSchemaProperties(fields: PlainField[]): Models.CustomProperties {
    return _.reduce(fields, function(result, field) {
      result[field.name] = {
        type: field.type,
        title: field.title,
        description: field.description,
        propertyOrder: field.order
      };

      if (field.type === "ddl") {
        _.assign(result[field.name], {
          type: "resourceId",
          resource: field.resource
        });
      } else if (field.type === "choices") {
        _.assign(result[field.name], {
          type: "string",
          enum: field.enum
        });
      }

      return result;
    }, <Models.CustomProperties>{});
  };

  function getSchemaRequired(fields: PlainField[]) {
    var required = _(fields).filter("required").map("name").valueOf();
    return required.length > 0 ? required : undefined;
  };

  function fieldsFromSchema(schema: Models.CustomSchema) {
    var convertType = function(prop) {
      if (prop.type === "resourceId") {
        return "ddl";
      } else if (!prop.type) {
        return "string";
      } else if (prop.type === "string" && !_.isEmpty(prop.enum)) {
        return "choices";
      } else {
        return prop.type;
      }
    };

    var required = _.keyBy(schema.required, _.identity);
    return _(schema.properties).map(function(info, name) {
      return {
        name: name,
        title: info.title,
        description: info.description,
        required: _.includes(required, name),
        type: convertType(info),
        resource: info.resource,
        enum: info.enum || [],
        order: info.propertyOrder
      };
    }).sortBy("order").value();
  };

  class SchemaEditorController {
    lists: DropDownListEntry[];
    fields: PlainField[];
    schema: Models.CustomSchema;
    title: string;

    // whether the field is expanded within the ui
    fieldExpand: {
      [index: number]: boolean;
    }

    typeOptions = [
      { type: 'string', name: 'Short Text' },
      { type: 'text', name: 'Long Text' },
      { type: 'integer', name: 'Integer' },
      { type: 'number', name: 'Decimal' },
      { type: 'boolean', name: 'Boolean (True/False)' },
      { type: 'choices', name: 'Short list of possibilities' },
      { type: 'ddl', name: 'Drop-down list of names' },
      { type: 'date', name: 'Date' },
      { type: 'datetime', name: 'Date and Time' }
    ];

    // @ngInject
    constructor(kinDdlList: DdlListService) {
      this.lists = kinDdlList.getLists().$object;
      this.fieldExpand = {};
    }

    hasPlaceholder() {
      return !_.every(this.fields, f => f.name);
    }

    addField() {
      this.fieldExpand[this.fields.length] = true;
      this.fields.push({
        type: "string",
        name: null,
        title: null
      });
    }

    fromModel(viewValue: Models.CustomSchema) {
      this.schema = viewValue;
      this.fields = fieldsFromSchema(this.schema);
      this.title = viewValue.title;
    }

    toModel(): Models.CustomSchema {
      var updates = {
        type: "object",
        properties: getSchemaProperties(this.fields),
        required: getSchemaRequired(this.fields)
      };
      return <Models.CustomSchema>_.assign({}, this.schema, updates);
    }

    renumberFields() {
      _.each(this.fields, (field, index) => {
        field.order = index + 1;
      });
    }
  }

  function schemaEditorDirective(): ng.IDirective {
    return {
      restrict: 'E',
      scope: {},
      templateUrl: "app/components/schema-editor/schema-editor.html",
      controller: SchemaEditorController,
      controllerAs: 'vm',
      require: ['kinSchemaEditor', '?ngModel'],
      link: function(scope: any, elem, attrs,
                     [ctrl, ngModel]: [SchemaEditorController, ng.INgModelController]) {
        scope.sortableOptions = {
          axis: "y",
          //handle: "> .dragHandle",
          update: function(e, ui) {
          },
          stop: function(e, ui) {
            ctrl.renumberFields();
          }
        };

        if (!ngModel)
          return;

        scope.$watch("vm.fields", function(fields) {
          ngModel.$setViewValue(ctrl.toModel());
        }, true);

        ngModel.$render = function() {
          ctrl.fromModel(ngModel.$viewValue);
        };
      }
    };
  }

  function newlineSeparatedDirective(): ng.IDirective {
    return {
      restrict: 'A',
      require: '^ngModel',
      link: function(scope, elem, attrs, ngModel: ng.INgModelController) {
        ngModel.$formatters.push(function(items) {
          return angular.isArray(items) ? items.join("\n") : "";
        });
        ngModel.$parsers.push(function(text) {
          return angular.isString(text) ? text.split("\n") : [];
        });
      }
    };
  }

  class EditChoicesController {
    choices: string[];
    editing: {
      [index: number]: boolean;
    };

    constructor() {
      this.choices = [];
      this.editing = {};
    }

    addChoice() {
      this.editing[this.choices.length] = true;
      this.choices.push("");
    }

    fromModel(viewValue) {
      this.choices = angular.copy(viewValue);
    }

    toModel() {
      return angular.copy(this.choices);
    }

    deleteChoice(index) {
      this.choices.splice(index, 1);
    }
  }

  function editChoicesDirective(): ng.IDirective {
    return {
      restrict: "E",
      require: "?ngModel",
      templateUrl: "app/components/schema-editor/edit-choices.html",
      controller: EditChoicesController,
      controllerAs: "vm",
      link: function(scope, elem, attrs, ngModel: ng.INgModelController) {
        var ctrl: EditChoicesController = scope.vm;
        if (ngModel) {
          ngModel.$render = () => {
            ctrl.fromModel(ngModel.$viewValue || []);
          }
          scope.$watch("vm.choices", (choices) => {
            ngModel.$setViewValue(ctrl.toModel());
          }, true);
        }
      }
    };
  }

  angular.module("kindred.components.schemaeditor", [])
    .directive("kinSchemaEditor", schemaEditorDirective)
    .directive('kinNewlineSeparated', newlineSeparatedDirective)
    .directive('kinEditChoices', editChoicesDirective);
}
