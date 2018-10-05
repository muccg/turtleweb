module Test {
  'use strict';

  export class TestParserCtrl {
    public resources: string[];
    public resource: string;
    public query: string;
    public search: kindred.Searcher;
    public ac: kindred.SearchAutoComplete;
    public study: Models.Study;

    // @ngInject
    constructor($scope: ng.IScope, kinSearcher, $rootScope: kindred.RootScope) {
      console.log("test parser");
      this.resources = ["person", "event", "sample", "user"];
      this.resource = "person";
      this.query = "hello";

      $rootScope.$watch<Models.Study>("study", study => {
        this.study = study;
      });

      $scope.$watch(() => {
        return {
          resource: this.resource,
          studyId: this.study ? this.study.id : null
        };
      }, (w) => {
        $rootScope.study = this.study;
        this.search = kinSearcher.make(w.resource, this.study);
      }, true);
    }
  }

  let TestView: ng.IComponentOptions = {
    templateUrl: 'app/test/test.html',
    $routeConfig: [
      {path: "/parser", name: "Parser", component: "kinTestParserView"}
    ]
  };

  let TestParserView: ng.IComponentOptions = {
    templateUrl: "app/test/parser.html",
    controller: TestParserCtrl,
    controllerAs: "vm"
  };

  angular.module('kindred.test', [
    'kindred.search'
  ])
    .component("kinTestView", TestView)
    .component("kinTestParserView", TestParserView)
    .controller("TestParserCtrl", TestParserCtrl);
}
