module kindred {
  'use strict';

  export class NavigationService {
    private instance: string;
    private title: string;
    private fullTitle: string;
    private breadcrumbs: Breadcrumb[];

    // @ngInject
    constructor(appConfig: AppConfig,
                private kinStudies: StudiesService,
                private $window: ng.IWindowService,
                private $timeout: ng.ITimeoutService) {
      this.instance = appConfig.instance.title;
    }

    setBreadcrumbs(breadcrumbs: Breadcrumb[]) {
      var last = _.last(breadcrumbs);
      this.setTitle((last ? last.title : "") || "");
      this.breadcrumbs = breadcrumbs;
    }

    getBreadcrumbs() {
      return this.breadcrumbs;
    }

    setTitle(title: string) {
      this.title = title;
      this.updateTitle();
    }

    private updateTitle() {
      var study = this.kinStudies.current;
      var base = study ? (study.name + " - " + this.instance) : this.instance;
      this.fullTitle = this.title ? (this.title + " - " + base) : base;
      this.$timeout(() => {
        this.$window.document.title = this.fullTitle;
      });
    }
    getTitle() {
      return this.title;
    }
  }

  angular.module("kindred.page.services", [])
    .service("kinNavigation", NavigationService);
}
