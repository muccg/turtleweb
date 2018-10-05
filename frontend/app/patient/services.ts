module kindred {
  'use strict';

  export class AddPatientsToStudyGroupService {
    // @ngInject
    constructor(private $uibModal: ng.ui.bootstrap.IModalService,
                private $rootRouter,
                private kinPreFill: PreFillService,
                private kinSaving: SavingService) {
    }

    addSingle(study: Models.Study, item: Models.Person) {
      return this.go(study, {
        name: ["pk"],
        value: item.id,
        exact: true
      }, 1);
    }

    addSearch(search: Searcher) {
      return this.go(search.study, search.expr, search.items.length);
    }

    private go(study: Models.Study, expr: Search.ApiSearchExpr, count: number) {
      var modalInstance = this.$uibModal.open({
        templateUrl: "app/studygroup/add-patients.html",
        // es6 class expression ... sort of cool
        controller: class {
          count: number;
          // @ngInject
          constructor(public studyGroups,
                      private kinSession: { user: Models.User },
                      private Restangular: restangular.IService) {
            this.count = count;
          }

          selectGroup(group) {
            if (group === null) {
              group = {
                name: '',
                owner: this.kinSession.user.resource_uri,
                study: study.resource_uri,
                members: [],
                jq: expr
              };
              group = this.Restangular.restangularizeElement(null, group, "studygroup", false);
            }

            modalInstance.close(group);
          }

          cancel() {
            modalInstance.dismiss('cancel');
          }
        },
        controllerAs: "vm",
        resolve: {
          // @ngInject
          studyGroups: function(Restangular: restangular.IService) {
            return Restangular.all("studygroup").getList({ study: study.id });
          }
        }
      });

      modalInstance.result.then((studygroup: Models.StudyGroup) => {
        var msg = (result) => {
          return result.added + " patient" + (result.added === 1 ? "" : "s")
            + " added to " + studygroup.name + ".";
        };
        if (studygroup.id) {
          this.kinSaving.monitor(studygroup.append(expr), msg).then(() => {
            this.$rootRouter.navigate(['/App/Studies', {study: study.slug},
                                       'StudyGroup/Detail', {id: studygroup.id}]);
          });
        } else {
          this.kinPreFill.set(studygroup);
          this.$rootRouter.navigate(['/App/Studies', {study: study.slug},
                                     'StudyGroup/Add']);
        }
      });
    }
  }

  export class CreateReportFromQueryService {
    // @ngInject
    constructor(private $rootRouter,
                private kinPreFill: PreFillService) {
    }
    go(search: Searcher) {
      this.kinPreFill.set({
        query: search.expr,
        resource: search.what,
        study: search.study
      });

      this.$rootRouter.navigate(["/App/Studies", {study: search.study.slug}, "Report/Add"]);
    }
  }

  interface SearchQuery {
    jq: Search.ApiSearchExpr;
  }

  export class FindDuplicatesService {
    count: number;
    items: Models.Person[];
    loading: boolean;

    // @ngInject
    constructor(private $rootScope: RootScope,
                private Restangular: restangular.IService) {
    }

    find(item: Models.Person): FindDuplicatesService {
      var getInteresting = function() {
        if (item && item.last_name && item.last_name.length > 3) {
          return {
            last_name: item.last_name,
            first_name: item.first_name,
            dob: item.dob,
            sex: item.sex
          };
        }
      };

      var makeQuery = function(i: Models.Person): SearchQuery {
        var q = [];
        if (i.dob) {
          q.push({
            name: ["dob"],
            value: {
              start: i.dob,
              end: i.dob
            },
            exact: false
          });
        }
        if (i.last_name) {
          q.push({
            name: ["name"],
            value: i.last_name,
            exact: false
          });
        }
        if (i.first_name) {
          q.push({
            name: ["name"],
            value: i.first_name,
            exact: false
          });
        }
        if (i.sex && i.sex !== "U") {
          q.push({
            or: [{
              name: ["sex"],
              value: i.sex,
              exact: false
            }, {
              name: ["sex"],
              value: "U",
              exact: false
            }]
          });
        }
        return {jq: { and: q }};
      };

      var check = _.debounce(i => {
        if (i) {
          this.$rootScope.$apply(() => {
            this.loading = true;
            this.Restangular.all("persondup")
              .getList(makeQuery(i))
              .then((items: Models.Person[]) => {
                this.items = items;
                this.count = items.length;
                this.loading = false;
              });
          });
        }
      }, 1000);

      if (item && angular.isUndefined(item.id)) {
        this.$rootScope.$watch(getInteresting, check, true);
      }

      return this;
    }
  }

  export interface ConsentCalc {
    consents: CalcStudyConsent[];
    consentMap: {
      [index: string /* study uri */]: CalcStudyConsent;
    };
    outcome: CalcStudyConsent;
  };

  export interface CalcStudyConsent extends Models.StudyConsent {
    status: Models.ConsentStatus;
    statusText: string;
    consent: boolean;
    study: Models.Study;
  };

  export class PatientConsentService {
    // @ngInject
    constructor(private kinStudies: StudiesService, private kinDdl: DdlService,
                private $q: ng.IQService) {
    }

    calc(studyMembership: Models.StudyMember[]): ng.IPromise<ConsentCalc> {
      return this.$q.all([
        this.kinStudies.get(),
        this.kinDdl.get("consentstatus")
      ]).then(([studies, consentStatus]) => {
        return this.calc2(studyMembership, <any>studies, <any>consentStatus);
      });
    }

    private calc2(studyMembership: Models.StudyMember[], studies: Models.Study[], consentStatus: Models.ConsentStatus[]): ConsentCalc {
      var studyMap = _.keyBy(studies, "resource_uri");
      var consentMap = _.keyBy(studyMembership, "study");
      var consentStatusMap = _.keyBy(consentStatus, "resource_uri");

      _.each(studyMembership, sm => {
        _.each(sm.consents, (consent: CalcStudyConsent) => {
          consent.status = consentStatusMap[<any>consent.status]
          consent.statusText = consent.status.name;
          consent.consent = consent.statusText.toLowerCase() === "consented" ||
            (_.includes(["not approached", "pending"], consent.statusText.toLowerCase()) ? null : false);
          consent.study = studyMap[<string>sm.study];
        });
        this.sortConsents(sm);
      });

      return {
        consents: <any>_(studyMembership).map(sm => sm.consents).flatten().valueOf(),
        outcome: <any>_(studyMembership)
          .filter(sm => sm.study === this.kinStudies.current.resource_uri)
          .map(sm => sm.consents).flatten().head(),
        consentMap: {}
      };
    }

    /**
     * Sort consent list within a StudyMember resource.
     * Other studies sorted last, empty dates first,
     * otherwise most recent dates first.
     */
    sortConsents(studyMember: Models.StudyMember) {
      studyMember.consents.sort((a, b) => {
        var aa = <Models.StudyConsent>a, bb = <Models.StudyConsent>b;
        if (aa.study_member != studyMember.resource_uri) {
            return 1;
          } else if (aa.date == bb.date) {
            return 0;
          } else if (!aa.date) {
            return -1;
          } else if (!bb.date) {
            return 1;
          } else {
            return aa.date < bb.date ? 1 : -1;
          }
      });
      return studyMember;
    }

    dateOrder(x) {
      return x.date || "";
    }
  }

  angular.module("kindred.patient.services", [])
    .service("kinAddPatientsToStudyGroup", AddPatientsToStudyGroupService)
    .service("kinCreateReportFromQuery", CreateReportFromQueryService)
    .service("kinFindDuplicates", FindDuplicatesService)
    .service("kinPatientConsent", PatientConsentService);
}
