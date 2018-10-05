/// <reference path="../../typings/tsd.d.ts" />

angular.module("kindred.import", [
  "kindred.import.controllers",
  "kindred.import.directives",
  "kindred.import.services"
]);

module ImportControllers {
  var m = angular.module("kindred.import.controllers", []);
}

module ImportServices {
  var m = angular.module("kindred.import.services", []);


  m.factory("kinImportCsvModals", function($uibModal) {
    var modal = function(template, result) {
      return $uibModal.open({
        templateUrl: "inline/import-csv-" + template + ".html",
        controller: function($scope) {
          $scope.result = result;
        }
      }).result;
    };

    return {
      showSuccess: function(result) {
        return modal("success", result);
      },
      showFailure: function(result) {
        return modal("failure", result);
      },
      showRaw: function(csvFile) {
        return modal("raw", csvFile);
      }
    };
  });

  m.factory("kinImportCsv", function($http, appConfig, Upload) {
    return {
      upload: function(file) {
        return Upload.upload({
          url: appConfig.urls.csv_upload,
          file: file
        });
      },
      go: function(csvtemp, opts) {
        var url = appConfig.api_base + "csvtemp/" + csvtemp.id + "/import";
        return $http.post(url, opts)
          .then(function(response) {
            return response.data;
          });
      }
    };
  });
}

module ImportDirectives {
  var m = angular.module("kindred.import.directives", []);

  interface CsvTemp {
    id: number;
    filename: string;
    header: string;
    data: string;
  }

  interface ImportCsvScope extends angular.IScope {
    accept: string;
    files: any[];
    csvError: string;
    csvFile?: CsvTemp;
    status: {};
  }

  m.directive("kinImportCsv", function(kinImportCsv, kinImportCsvModals, Restangular) {
    return {
      restrict: "E",
      scope: {
        resource: "@",
        ctrl: "=name",
        onFinish: "&"
      },
      templateUrl: "app/import/import-csv.html",
      controller: function($scope) {
        this.doImport = function() {
          var extra = {
            resource: $scope.resource
          };
          var options = _.assign({}, $scope.options, extra);
          $scope.importProgress = 42;
          kinImportCsv.go($scope.csvFile, options).then(function(result) {
            $scope.importProgress = 100;
            kinImportCsvModals.showSuccess(result).finally(function() {
              $scope.onFinish();
            });
          }, function fail(response) {
            $scope.importProgress = 0;
            kinImportCsvModals.showFailure(response.data);
          });
        };
      },
      link: function(scope: any, elem, attrs, ctrl) {
        scope.ctrl = ctrl;
        scope.accept = "*.csv,text/csv";

        scope.$watch("files", function(files) {
          if (files && files.length) {
            scope.csvError = null;
            scope.csvFile = null;

            kinImportCsv.upload(files[0])
              .progress(function(evt) {
                evt.config.file.progress = 100.0 * evt.loaded / evt.total;
              })
              .success(function(data, status, headers, config) {
                var id = data.ids[0];
                if (id) {
                  scope.loadCsv({ id: id });
                } else {
                  scope.csvError = "couldn't get an id";
                }
              })
              .error(function(data, status, headers, config) {
                scope.csvError = data.msg || "failed to upload";
                console.log("error", data)
                console.log("status", status);
              });
          }
        });

        scope.loadCsv = function(csvFile) {
          scope.csvError = null;
          scope.csvFile = csvFile;
          Restangular.one("csvtemp", csvFile.id).get().then(function(csvFile) {
            scope.csvFile = csvFile;
            scope.options.mapping = initialMapping(csvFile);
            if (!_.some(scope.history, { id: csvFile.id })) {
              scope.history.unshift(csvFile);
            }
          });
        };

        scope.showRaw = kinImportCsvModals.showRaw;
        scope.history = Restangular.all("csvtemp").getList().$object;
        scope.status = {};
        scope.options = {
          create: true,
          update: true,
          overwrite_empty: true,
          key: "id",
          mapping: {}
        };

        var initialMapping = function(csvFile) {
          return _.reduce(csvFile.header, function(r, header: string) {
            r[header] = header;
            return r;
          }, {});
        };

        scope.$watch("options", function() {
          importCsv(function(result) {
            scope.csvPreview = result;
          }, function problem(data) {
            scope.csvPreview = null;
          });
        }, true);

        var importCsv = function(success, fail) {
          if (scope.csvFile) {
            var extra = {
              dry_run: true,
              resource: scope.resource
            };
            var options = _.assign({}, scope.options, extra);
            return kinImportCsv.go(scope.csvFile, options).then(success, fail);
          }
        };

        scope.$watch("csvPreview.success", function(success) {
          ctrl.invalid = !success;
        });
      }
    };
  });

  m.directive("kinImportFieldSelect", function(kinSchema) {
    return {
      restrict: "E",
      scope: {
        resource: "="
      },
      require: 'ngModel',
      templateUrl: "app/import/field-select.html",
      link: function(scope: any, elem, attrs, ngModel) {
        scope.$watch("resource", function(resource) {
          if (resource) {
            kinSchema.get(resource).then(function(schema) {
              scope.schema = schema;
            });
          }
        });

        if (ngModel) {
          ngModel.$render = function() {
            scope.fieldName = ngModel.$viewValue;
          };
          
          scope.$watch("fieldName", function(fieldName) {
            ngModel.$setViewValue(fieldName);
          });
        }
      }
    };
  });
}
