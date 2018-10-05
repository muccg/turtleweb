module kindred {
  'use strict';

  interface QuickSearchScope extends ng.IScope {
    loadingResults: boolean;
    templateUrl: string;
    getResults(q: any): angular.IPromise<any[]>;
    study: { id: string };
    query: string;
    onSelect(any): void;
  }

  // @ngInject
  export function quickSearchDirective(Restangular: restangular.IService,
                                       $filter: ng.IFilterService,
                                       $rootRouter, kinStudies: StudiesService,
                                       $timeout: ng.ITimeoutService): ng.IDirective {
    var personFullName = $filter<PersonFullNameFilter>("personFullName");
    return {
      restrict: 'E',
      templateUrl: 'app/search/quick-search/quick-search.html',
      link: function(scope: QuickSearchScope, elem, attrs) {
        scope.loadingResults = false;
        scope.templateUrl = 'app/search/quick-search/result';
        scope.getResults = function(name) {
          var query = { study: scope.study.id, jq: angular.toJson(name) };
          return Restangular.all("person").getList(query)
            .then(function(results) {
              return _.map(results, function(result) {
                return {
                  name: personFullName(result),
                  person: result
                };
              });
            });
        };
        scope.query = "";

        scope.onSelect = function(item) {
          $rootRouter.navigate(["Studies", {study: kinStudies.current ? kinStudies.current.slug : '_'},
                                "Person", "Detail", {id: item.person.id}]);
          scope.query = "";

          // fixme: this is a bit lame
          $timeout(function() {
            elem.find("input").trigger("blur");
          }, 10);
        };
      }
    };
  }
}
