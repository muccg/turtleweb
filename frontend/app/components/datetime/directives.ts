module kindred {
  'use strict';

  let datePickerComponent: ng.IComponentOptions = {
    require: {
      ngModel: '?ngModel'
    },
    templateUrl: 'app/components/datetime/date-picker.html',
    bindings: {
      'inputId': '@id',
      'type': '@',
      'ngDisabled': '<',
      'ngRequired': '<'
    },
    controller: class {
      ngModel: ng.INgModelController;
      type: string;
      opened: boolean;
      dt: Date;

      dateOptions = {
        formatYear: 'yy',
        startingDay: 1
      };
      formats = ['dd/MM/yyyy', 'd/M/yyyy', 'd/M/yy', 'dd/MM/yy'];

      // @ngInject
      constructor($scope: ng.IScope, private kinDateTimeUtil: DateTimeUtilService) {
        var checkType = kinDateTimeUtil.checkType("kinDatePicker");
        $scope.$watch("$ctrl.type", () => {
          checkType(this.type);
          // default to plain date format
          this.type = this.type || "isodate";
        });

        // view->model
        $scope.$watch('$ctrl.dt', () => {
          if (this.ngModel) {
            this.ngModel.$setViewValue(kinDateTimeUtil.toMoment(this.dt));
          }
        });
      }

      open($event: ng.IAngularEvent) {
        $event.preventDefault();
        $event.stopPropagation();
        this.opened = true;
      }

      $onInit() {
        if (this.ngModel) {
          this.ngModel.$formatters.push(anything => {
            return this.kinDateTimeUtil.toMoment(anything);
          });
          this.ngModel.$parsers.push(m => {
            return this.kinDateTimeUtil.modelFormat(m, this.type, true);
          });

          // model->view
          this.ngModel.$render = () => {
            var m = this.ngModel.$viewValue;
            // ui-bootstrap 0.13.0 datepicker likes javascript date object
            this.dt = m ? m.toDate() : null;
          };
        }
      }
    }
  };

  function timePickerDirective(kinDateTimeUtil: DateTimeUtilService): ng.IDirective {
    return {
      restrict: 'A',
      require: '?ngModel',
      scope: {
        type: '@kinTimePicker'
      },
      link: function(scope, elem, attrs, ngModel: ng.INgModelController) {
        scope.$watch("type", kinDateTimeUtil.checkType("kinTimePicker"));

        if (!ngModel)
          return;

        ngModel.$formatters.push(function(val) {
          var m = kinDateTimeUtil.viewFormat(val, scope.type);
          scope.moment = m;
          return m ? m.format("HH:mm:ss") : undefined;
        });
        ngModel.$parsers.push(function(text) {
          var m = moment(scope.moment);
          var time = kinDateTimeUtil.parseTime(text);
          if (time) {
            m.hour(time.hour());
            m.minute(time.minute());
            m.second(time.second());
            m.millisecond(time.millisecond());
            return kinDateTimeUtil.modelFormat(m, scope.type, true);
          }
        });
      }
    };
  }

  angular.module("kindred.components.datetime.directives", [
    "kindred.components.datetime.services"
  ])
    .component("kinDatePicker", datePickerComponent)
    .directive("kinTimePicker", timePickerDirective);
}
