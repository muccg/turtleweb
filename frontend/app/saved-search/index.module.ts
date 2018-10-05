module kindred {
  'use strict';

  export class SavedSearchService {
    // @ngInject
    constructor(private $rootRouter,
                private kinPreFill: PreFillService,
                private kinSaving: SavingService) {
    }

    create(search: Searcher) {
      this.kinPreFill.set({
        query: search.expr,
        resource: search.what,
        study: search.study,
        list_columns: search.fields.show,
        order_by: search.fields.sort
      });
      this.$rootRouter.navigate(["/App/Studies", {study: search.study ? search.study.slug : "_" }, "SavedSearch", "Add"]);
    }
    update(search: Searcher) {
      if (search.saved) {
        search.saved.query = search.expr;
        search.saved.list_columns = search.fields.show;
        search.saved.order_by = search.fields.sort;
        this.kinSaving.monitor(search.saved.save());
      }
    }

    viewLink(search: Models.Search) {
      var list = {
        person: "Person",
        event: "Event"
      };
      if (list[search.resource]) {
        return [list[search.resource], "List"];
      } else {
        return ["/App/Biobank/Sample/List"];
      }
    }

    editLink(search: Models.Search) {
      return ["SavedSearch", "Edit", { id: search.id }];
    }
  }

  // @ngInject
    export function savedSearchTableDirective(Restangular: restangular.IService, kinSearcher: SearcherService, kinSavedSearch: SavedSearchService): ng.IDirective {
    return {
      restrict: 'E',
      scope: {
        study: '='
      },
      templateUrl: "app/saved-search/table.html",
      link: function(scope: any, elem, attrs) {

        scope.$watch("study.id", function(studyId) {
          Restangular.all("search").getList({ study: studyId })
            .then(function(searches) {
              scope.searches = searches;
            });
        });

        scope.selectSearch = function(search) {
          kinSearcher.loadSavedSearch(search);
        };
        scope.searchViewLink = kinSavedSearch.viewLink;
        scope.searchEditLink = kinSavedSearch.editLink;
      }
    };
  }

  export class SearchEditCtrl extends BaseEditCtrl<Models.Search> {
    public static resourceName = "search";

    // @ngInject
    constructor(kinBaseEdit, private kinSession: SessionService,
                private kinSearcher: SearcherService,
                private kinSavedSearch: SavedSearchService) {
      super(kinBaseEdit);
    }

    initItem(item: Models.Search) {
      var uniq = s => {
        var ss = [];
        if (_.isString(s)) {
          ss = s.split(/\s+/);
        } else if (_.isArray(s)) {
          ss = s;
        }
        return _.uniq(ss);
      };

      // regrettable copy&paste from ReportEditCtrl
      // fill item with default values
      item.owner = item.owner || this.kinSession.user.resource_uri;
      item.study = item.study || this.currentStudy;
      item.resource = item.resource || "person";
      item.order_by = <any>uniq(item.order_by);
      item.list_columns = <any>uniq(item.list_columns);

      this.orderFieldNames = _.map(this.orderFieldNames2, f => f.field);

      return item;
    }

    // fixme: need to define a service with resource fields which is
    // also used by the grids
    orderFieldNames2 = [{
        field: "id",
        desc: "ID"
      }, {
        field: "last_name",
        desc: "Surname"
      }, {
        field: "first_name",
        desc: "Given Name"
      }, {
        field: "dob",
        desc: "DOB"
      }, {
        field: "sex",
        desc: "Sex"
      }];
    orderFieldNames: string[];

    groupFieldNames = [
        "sex", "dob.year", "dob.month",
        "address.suburb", "address.state",
        "study", "project"
    ];

    colFieldNames = [
        "id", "last_name", "first_name", "dob", "dod", "sex"
    ];

    beforeSave(search) {
      // convert study object into a resource uri which tastypie expects
      if (search.study && search.study.resource_uri) {
        search.study = search.study.resource_uri;
      }
      return search;
    }

    redirect(search) {
      this.kinSearcher.loadSavedSearch(search);
      return super.redirect(search);
    }

    redirectRoute(search) {
      var link = this.kinSavedSearch.viewLink(this.item);
      if (search.study) {
        return _.concat(["..", ".."], link);
      } else {
        return link;
      }
    }
  }

  export let SavedSearchView: ng.IComponentOptions = {
    template: '<ng-outlet></ng-outlet>',
    $routeConfig: [
      {path: '/:id/edit', name: 'Edit', component: 'kinSavedSearchEditView'},
      {path: '/add',      name: 'Add',  component: 'kinSavedSearchEditView'}
    ]
  };

  export let SavedSearchEditView: ng.IComponentOptions = {
    templateUrl: "app/saved-search/edit.html",
    bindings: { $router: '<' },
    controller: SearchEditCtrl,
    controllerAs: "vm"
  };

  angular.module("kindred.savedsearch", [])
    .service("kinSavedSearch", SavedSearchService)
    .directive("kinSavedSearchTable", savedSearchTableDirective)
    .component("kinSavedSearchView", SavedSearchView)
    .component("kinSavedSearchEditView", SavedSearchEditView)
    .controller("SearchEditCtrl", SearchEditCtrl);
}
