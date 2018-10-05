module kindred {
  'use strict';

  // @ngInject
  function displayEventsTableDirective(Restangular: restangular.IService, kinUserPerms: UserPermsService, kinExpandState: ExpandStateService, kinStudies: StudiesService): ng.IDirective {
    return {
      restrict: 'E',
      require: 'ngModel',
      templateUrl: "app/event/display-table.html",
      replace: true, // bootstrap .panel > table css requires it
      scope: {
        patient: '<',
        patientHasCases: '<'
      },
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {
        scope.perms = kinUserPerms;
        scope.kinExpandState = kinExpandState;
        ngModel.$render = function() {
          scope.events = ngModel.$viewValue;
        };

        scope.eventLink = (event, name) => {
          var study = kinStudies.getByUri(event.study);
          return ["/App/Studies", {study: study.slug},
                  "Person/Event", { id: scope.patient.id },
                  name, { eventId: event.id }];
        };
      }
    };
  }

  // @ngInject
  function eventSummaryDirective(Restangular: restangular.IService, crud: CrudService, kinStudies: StudiesService): ng.IDirective {
    return {
      restrict: 'E',
      require: 'ngModel',
      template: '<a ng-if="event" ng-link="link">{{ event.type.name }}</a>' +
        '<span ng-if="!event" class="loading">Loading...</span>',
      scope: {
      },
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {
        var updateEventUri = function(uri) {
          scope.eventUri = uri;
          if (uri) {
            Restangular.oneUrl("event", uri).get().then(function(event) {
              scope.event = event;
              scope.patientId = crud.parseResourceUri(event.person);
              var study = event.study ? kinStudies.getByUri(event.study) : null;
              scope.link = ['/App/Studies', {study: study ? study.slug : '_'},
                            'Person', 'Detail', {id: scope.patientId}];
            });
          }
        };

        ngModel.$render = function() {
          updateEventUri(ngModel.$viewValue);
        };
      }
    };
  }

  // @ngInject
  function addEventButtonDirective(kinPreFill: PreFillService, kinEventTypes: EventTypesService): ng.IDirective {
    return {
      restrict: 'E',
      scope: {
        patient: '=',
        study: '=?'
      },
      templateUrl: "app/event/add-event-button.html",
      link: function(scope: any, elem, attrs) {
        scope.eventTypes = kinEventTypes.get();
        scope.addEvent = function(et) {
          kinPreFill.set({
            eventType: et
          });
        };

        scope.status = {};

        scope.isApplicable = et => kinEventTypes.isApplicable(scope.study, et)
      }
    };
  }

  interface MissingField {
    name: string;
    title: string;
    type: string;
    origType: string;
  }

  let eventTypeChangeWarningComponent: ng.IComponentOptions = {
    templateUrl: "app/event/event-type-change-warning.html",
    bindings: {
      eventType: "<",
      data: "<"
    },
    controllerAs: "vm",
    controller: class {
      eventType: Models.EventType;
      data: {};

      origEventType: Models.EventType;
      missingFields: MissingField[];

      // @ngInject
      constructor($scope: ng.IScope, private kinSchemaUtil: SchemaUtilService) {
        $scope.$watch(() => this.eventType, eventType => {
          if (eventType) {
            if (!this.origEventType) {
              // record the first event type setting
              this.origEventType = eventType;
            } else {
              // subsequent changes require a calculation
              this.eventTypeChanged();
            }
          }
        });
      }

      /**
       * When user edits event type, recalculate list of fields which
       * would be "lost" by switching event type.
       */
      private eventTypeChanged() {
        if (this.origEventType) {
          var origProps = this.origEventType.fields ?
            this.origEventType.fields.properties : null;
          var props = this.eventType && this.eventType.fields ?
            this.eventType.fields.properties : null;

          this.missingFields = _.filter(_.map(origProps, (prop: Models.CustomProp, name: string) => {
            return props && this.needWarning(name, prop, props[name]) ? {
              name: name,
              title: this.kinSchemaUtil.makeHeading(name, prop),
              origType: prop ? prop.type : undefined,
              type: props[name] ? props[name].type : undefined
            } : null;
          }), null);
        }
      }

      /**
       * Need a warning if the field has a value and:
       *  - field doesn't exist on new event type; or
       *  - field type changed
       */
      private needWarning(name: string, origProp: Models.CustomProp, prop: Models.CustomProp) {
        return this.data && this.data[name] &&
          (!prop || (origProp && prop.type !== origProp.type));
      }
    }
  };

  angular.module("kindred.event.directives", [])
    .directive("kinDisplayEventsTable", displayEventsTableDirective)
    .directive("kinEventSummary", eventSummaryDirective)
    .directive("kinAddEventButton", addEventButtonDirective)
    .component("kinEventTypeChangeWarning", eventTypeChangeWarningComponent);
}
