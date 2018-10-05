module kindred {
  'use strict';

  export class HomeCtrl {
    studies: Models.Study[];
    someArchived: boolean;
    showArchived: boolean;

    // @ngInject
    constructor($scope: ng.IScope, kinStudies: StudiesService) {
      kinStudies.get().then(studies => {
        this.studies = studies;
      });

      $scope.$watch(() => _.some(this.studies, "archived"), a => {
        this.someArchived = a;
      });
    }
  }

  angular.module("kindred.controllers", [
    'ui.select',
    'kindred.services',
    'chart.js'
  ]).controller("HomeCtrl", HomeCtrl);
}
