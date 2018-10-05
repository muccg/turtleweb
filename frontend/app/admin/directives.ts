module kindred {
  'use strict';

  // @ngInject
  export function kinFieldCaseEditDirective(): ng.IDirective {
    return {
      restrict: 'E',
      require: '?ngModel',
      scope: {
        properties: '=',
        patientCases: '=',
        studies: '='
      },
      templateUrl: "app/admin/field-case-edit.html",
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {
        scope.selected = {};

        scope.$watch("studies", function() {
          refilter();
        }, true);

        scope.$watch("patientCases", function() {
          refilter();
        }, true);

        var refilter = function() {
          var allStudies = _.keyBy(scope.$root.studies, "resource_uri");
          var studies = _.keyBy(scope.studies, _.identity);
          var patientCases = _(<Models.PatientCase[]>scope.patientCases).sortBy("order").sortBy("study");
          var filtered = patientCases.filter(function(c) {
            return _.isEmpty(studies) || _.includes(studies, c.study);
          });
          scope.filteredPatientCases = filtered.valueOf();
          scope.filteredPatientCaseGroups = filtered
            .groupBy("study")
            .map(function(cases, study_uri) {
              return {
                study: allStudies[study_uri],
                cases: cases
              };
            })
            .valueOf();
        };

        var toHiding = function(fields: any[]) {
          return _.reduce(fields, function(result, field) {
            if (!_.isEmpty(field.disabled)) {
              result[field.name] = _(field.disabled).map(function(d, uri) { return d ? uri : ""; }).compact().valueOf();
            }
            return result;
          }, {});
        };

        var fromHiding = function(caseHiding, properties) {
          caseHiding = caseHiding || {};
          return _.map(properties, function(prop, name) {
            return {
              name: name,
              disabled: _.reduce(caseHiding[name], function(result, uri: string) {
                result[uri] = true;
                return result;
              }, {})
            };
          });
        };

        var update = function() {
          scope.fields = fromHiding(scope.caseHiding, scope.properties);
        };

        scope.$watch("properties", function() {
          update();
        });

        scope.$watch("fields", function(fields) {
          if (ngModel) {
            ngModel.$setViewValue(toHiding(fields));
          }
        }, true);

        if (ngModel) {
          ngModel.$render = function() {
            scope.caseHiding = ngModel.$viewValue;
            update();
          };
        }
      }
    };
  }

}
