module kindred {
  'use strict';

  export type StudiesPromise = ng.IPromise<Models.Study[]>;

  export class StudiesService {
    /** cached study list */
    studies: Models.Study[];
    /** the study which corresponds to url route, or null if none selected */
    current: Models.Study;
    /** mapping of slug to study */
    studySlug: {
      [index: string]: Models.Study;
    };

    /** callback for when fallback study gets set */
    onSetFallback: (from: any[]) => void;

    // cached promise to get studies
    private promise: StudiesPromise;

    // @ngInject
    constructor(private $rootScope: RootScope,
                private $q: ng.IQService,
                private Restangular: restangular.IService) {
      this.studies = [];
      this.current = null;
    }

    get(): StudiesPromise {
      if (!this.promise) {
        this.promise = this.fetch().catch(error => {
          // don't cache a failed fetch
          this.promise = null
          return this.$q.reject(error)
        });
      }
      return this.promise;
    }

    private fetch(): StudiesPromise {
      return this.Restangular.all("study").getList({ limit: 0 })
        .then(studies => {
          this.studies.splice(0, this.studies.length);
          _.each(studies, (study: Models.Study) => {
            this.studies.push(study);
          });
          this.studySlug = _.keyBy(this.studies, "slug");
          return this.studies;
        });
    }

    refresh(): StudiesPromise {
      this.promise = null;
      return this.get();
    }

    getBySlug(slug: string): ng.IPromise<Models.Study> {
      return this.get().then(studies => {
        return this.studySlug[slug];
      });
    }

    setStudy(slug: string): Models.Study {
      this.current = slug ? this.studySlug[slug] : null;
      this.updateScope();
      return this.current;
    }

    private updateScope() {
      // set the global variable for the current study
      this.$rootScope.studies = this.studies;
      this.$rootScope.study = this.current;
    }

    // this is used to change study when a record is viewed which is
    // associated with a study.
    public setFallback(studyMembership: Models.StudyMember[], from: any[]) {
      if (!this.current && studyMembership.length > 0) {
        var pat = { resource_uri: studyMembership[0].study };
        var study = _.find(this.studies, pat);
        if (study) {
          this.setStudy(study.slug);
          if (this.onSetFallback) {
            this.onSetFallback(from);
          }
        }
      }
    }

    public getByUri(uri: string): Models.Study {
      return _.find(this.studies, { "resource_uri": uri });
    }
  }

  interface UriMap {
    [index: string]: boolean;
  }

  class StudySelectMultiCtrl {
    onChange: (val: any) => void;
    selected: UriMap;
    allSelected: boolean;
    studies: Models.Study[];

    // @ngInject
    constructor(kinStudies: StudiesService) {
      kinStudies.get().then(studies => {
        this.studies = studies;
      });
    }

    private toMap(items: string[]): UriMap {
      return _.reduce(items, (result, item) => {
        result[item] = true;
        return result
      }, <UriMap>{});
    };

    private fromMap(m: UriMap): string[] {
      return _.reduce(m, (result, set, key) => {
        if (set) {
          result.push(key);
        }
        return result;
      }, []);
    }

    private makeAllSelected() {
      this.selected = this.toMap(_.map(this.studies, s => s.resource_uri));
    }

    private makeNoneSelected() {
      this.selected = {};
    }

    allSelectedChanged() {
      if (this.allSelected) {
        this.makeAllSelected();
      } else {
        this.makeNoneSelected();
      }
      this.updateValue();
    }

    studySelectedChanged(study: Models.Study) {
      this.allSelected = this.updateValue();
    }

    private updateValue(): boolean {
      var studies = this.fromMap(this.selected);
      var all = (studies.length === this.studies.length);
      if (this.onChange) {
        this.onChange(all ? [] : studies);
      }
      return all;
    }

    setValue(val) {
      if (val && val.length === 0) {
        this.allSelected = true;
        this.makeAllSelected();
      } else {
        this.allSelected = false;
        this.selected = this.toMap(val);
      }
    }
  }

  function studySelectMultiDirective(): ng.IDirective {
    return {
      restrict: 'E',
      require: ['kinStudySelectMulti', '?ngModel'],
      scope: {},
      controller: StudySelectMultiCtrl,
      controllerAs: 'vm',
      templateUrl: "app/study/study-select-multi.html",
      link: function(scope, elem, attrs,
                     [ctrl, ngModel]: [StudySelectMultiCtrl, ng.INgModelController]) {
        if (ngModel) {
          ngModel.$render = () => ctrl.setValue(ngModel.$viewValue);
          ctrl.onChange = val => ngModel.$setViewValue(val);
        }
      }
    };
  }

  class StudyMenuCtrl {
    studies: Models.Study[];
    archived: boolean; // user wants to see archived studies

    // whether the study is archived
    isArchived: {
      [index: string]: boolean;
    };
    // whether the study should be shown
    show: {
      [index: string]: boolean;
    };

    updateStudies() {
      var pairs = _.map(this.studies, study => [study.resource_uri, !!study.archived]);
      this.isArchived = <any>_.fromPairs(pairs);
      this.updateShow();
    }

    updateShow() {
      if (this.isArchived) {
        this.show = _.mapValues(this.isArchived, isArchived => {
          return !_.isBoolean(this.archived) || this.archived === isArchived;
        });
      }
    }
  }

  function studyMenuDirective(): ng.IDirective {
    return {
      restrict: 'E',
      templateUrl: "app/study/study-menu.html",
      scope: {
        studies: '=',
        archived: '=?'
      },
      bindToController: true,
      controllerAs: "vm",
      controller: StudyMenuCtrl,
      link: function(scope, elem, attrs, ctrl: StudyMenuCtrl) {
        scope.$watch("vm.studies", () => ctrl.updateStudies());
        scope.$watch("vm.archived", () => ctrl.updateShow());
      }
    };
  }

  angular.module("kindred.study", [])
    .service("kinStudies", StudiesService)
    .directive('kinStudySelectMulti', studySelectMultiDirective)
    .directive("kinStudyMenu", studyMenuDirective);

}
