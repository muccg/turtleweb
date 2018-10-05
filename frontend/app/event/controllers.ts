module kindred {
  'use strict';

  export class EventEditCtrl extends BaseEditCtrl<Models.Event> {
    public static resourceName = "event";

    person: Models.Person;
    eventType: Models.EventType;
    eventTypes: Models.EventType[];
    patientHasCase: Models.PatientHasCase[];

    // @ngInject
    constructor(kinBaseEdit, $scope: ng.IScope,
                kinEventTypes: EventTypesService,
                private kinStudies: StudiesService) {
      super(kinBaseEdit);

      kinEventTypes.load(kinStudies.current).then(eventTypes => {
        this.eventTypes = eventTypes;
      });

      // if event type on item changes (e.g. from version revert)
      // transfer it back to the eventType instance variable.
      $scope.$watch(() => this.item ? this.item.type : null, (eventType: Models.EventType) => {
        if (eventType) {
          this.eventType = eventType;
        }
      });
    }

    protected getDeps(params: {}) {
      var reqs: any = {};
      if (params.hasOwnProperty("id")) {
        reqs.person = this.s.Restangular.one("person", params["id"]).get()
          .then(person => {
            this.person = person;
            return person;
          })
          .then(person => {
            return this.s.Restangular.all("patienthascase").getList({
              study_member__patient: person.id
            }).then(patientHasCase => {
              this.patientHasCase = patientHasCase;
            });
          });
      }
      if (params.hasOwnProperty("eventTypeId")) {
        reqs.eventType =
          this.s.Restangular.one("eventtype", params["eventTypeId"])
          .get().then(eventType => {
            this.eventType = eventType;
          });
      }
      return this.s.$q.all(reqs);
    }

    protected getItem(params: {}) {
      return this.s.getItem(this.getResourceName(), params, "eventId", {
        person: this.person,
        type: this.eventType
      });
    }

    protected getMoreDeps(event: Models.Event) {
      this.eventType = <Models.EventType>event.type;
      return event;
    }

    protected initItem(item) {
      // initial value of date
      item.date = item.date || moment().format();
      return super.initItem(item);
    }

    beforeSave(item) {
      var person = <Models.Person>item.person;
      if (person.resource_uri) {
        person = item.person.resource_uri;
      }

      if (this.eventType.resource_uri) {
        item.type = this.eventType.resource_uri;
      }

      // set initial event study to the current study
      item.study = item.study || this.kinStudies.current.resource_uri;

      return item;
    }

    redirectRoute(item) {
      if (this.person) {
        return ["..", "..", "Detail", { id: this.person.id }];
      } else {
        return ["..", "..", "..", "Event", "List"];
      }
    }

    indentedEventName(et) {
      var indent = et.depth || 0;
      return Array(indent + 1).join(".. ") + et.name;
    }
  }


  export class EventListCtrl {
    search: Searcher;
    status: {
      isopen?: boolean;
    };
    ac: SearchAutoComplete;
    savedSearch: SavedSearchService;
    $router: any;

    // @ngInject
    constructor(kinSearcher: SearcherService,
                kinStudies: StudiesService,
                kinSavedSearch: SavedSearchService) {
      this.search = kinSearcher.make('event', kinStudies.current);
      this.savedSearch = kinSavedSearch;
      this.status = {};
    }

    // fixme: implement a row-sref attr in <kin-grid>
    rowSelect(item) {
      this.$router.navigate(["..", "..", "Person", "Event", { id: item.person.id}, "Edit", { eventId: item.id }]);
      //this.$router.navigate(["Edit", { eventId: item.id }]);
    }

    submit() {
      var singleResult = this.search.checkRepeatedSearch();
      if (singleResult) {
        this.rowSelect(singleResult);
      } else {
        this.search.search().then(() => {
          if (this.ac) {
            this.ac.hide();
          }
        });
      }
    }
  }

  export let EventView: ng.IComponentOptions = {
    template: "<ng-outlet></ng-outlet>",
    $routeConfig: [
      {path: "/list",   name: "List",   component: "kinEventListView"},
      {path: "/:eventId/edit",   name: "Edit",   component: "kinEventEditView"},
      {path: "/import", name: "Import", component: "kinEventImportView"}
    ],
    bindings: { $router: "<" }
  };

  export let PersonEventView: ng.IComponentOptions = {
    template: "<ng-outlet></ng-outlet>",
    $routeConfig: [
      {path: "/list",         name: "List",    redirectTo: [".."]},
      {path: "/add/:eventTypeId",    name: "Add",       component: "kinEventEditView"},
      {path: "/:eventId",     name: "Detail",  redirectTo: ["Edit"]},
      {path: "/:eventId/edit",       name: "Edit",      component: "kinEventEditView"},
      {path: "/:eventId/add-sample", name: "AddSample", component: "kinSampleAddView"}
    ],
    bindings: { $router: "<" },
    controller: RouteParamsCtrl
  };

  export let EventListView: ng.IComponentOptions = {
    templateUrl: "app/event/list.html",
    controllerAs: "vm",
    controller: "EventListCtrl",
    bindings: { $router: "<" }
  };

  export let EventEditView: ng.IComponentOptions = {
    templateUrl: "app/event/edit.html",
    controllerAs: "vm",
    controller: EventEditCtrl,
    bindings: { $router: "<" }
  };

  export let EventImportView: ng.IComponentOptions = {
    templateUrl: "app/event/import-csv.html",
    bindings: { $router: "<" }
  };

  angular.module("kindred.event.controllers", [])
    .controller("EventEditCtrl", EventEditCtrl)
    .controller("EventListCtrl", EventListCtrl)
    .component("kinEventView", EventView)
    .component("kinPersonEventView", PersonEventView)
    .component("kinEventListView", EventListView)
    .component("kinEventEditView", EventEditView)
    .component("kinEventImportView", EventImportView);
}
