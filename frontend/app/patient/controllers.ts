module kindred {
  'use strict';

  export class PatientDetailCtrl extends BaseDetailCtrl<Models.Person> {
    public static resourceName = "person";

    studyMembership: Models.StudyMember[];
    studyMember: Models.StudyMember;
    patientHasCase: Models.PatientHasCase[];
    patientStudies: Models.Study[];
    addresses: any[];
    events: Models.Event[];
    limitEventsStudy: boolean;

    // @ngInject
    constructor(kinBaseEdit,
                private Restangular: restangular.IService,
                private kinPatientConsent: PatientConsentService,
                private kinStudies: StudiesService,
                private kinAddPatientsToStudyGroup: AddPatientsToStudyGroupService,
                private kinRouteParams: RouteParamsService,
                $scope: ng.IScope) {
      super(kinBaseEdit)
      this.studyMembership = [];

      this.limitEventsStudy = true;
      $scope.$watch(() => [this.limitEventsStudy, this.kinStudies.current],
                    () => this.item && this.getEvents(), true);
    }

    getMoreDeps(item) {
      return item.getStudyMembership().then(membership => {
        this.setStudyMembership(membership);
        return item;
      });
    }

    private setStudyMembership(membership) {
      this.kinStudies.setFallback(membership, ['Person', 'Detail', {id: this.item.id}]);
      this.studyMembership = membership;
      if (this.kinStudies.current) {
        this.studyMember = _.find(this.studyMembership, { study: this.kinStudies.current.resource_uri });
        if (this.studyMember) {
          this.patientHasCase = this.Restangular.all("patienthascase")
            .getList({ study_member: this.studyMember.id }).$object;
        }
      }

      this.patientStudies = _.map(this.studyMembership, m => this.kinStudies.getByUri(<string>m.study));
    }

    itemLoaded(item: Models.Person) {
      this.addresses = null;
      item.getAddresses().then(addresses => { this.addresses = addresses; });
      this.getEvents();
      return item;
    }

    private getEvents() {
      var eventQuery = {
        limit: 0,
        study: this.limitEventsStudy && this.kinStudies.current
          ? this.kinStudies.current.id : undefined,
        person: this.item.id
      };
      this.events = null;
      this.item.getEvents(eventQuery)
        .then(events => { this.events = events; });
    }

    addToStudyGroup() {
      this.kinAddPatientsToStudyGroup.addSingle(this.kinStudies.current, this.item);
    }

    /* Stashing routeParams same as RouteParamsCtrl. Is required so
     * that Consent view has access to the person id.
     *
     * fixme: investigate putting this routeParams stuff in base detail controller
     * fixme: hopefully it's fixed in later versions of angular-component-router
     */
    private routeParams: string[];
    $routerOnActivate(next, previous) {
      this.routeParams = _.keys(next.params);
      this.kinRouteParams.update(next.params);
      return super.$routerOnActivate(next, previous);
    }
    $routerOnDeactivate(next, previous) {
      this.kinRouteParams.remove(this.routeParams);
      return super.$routerOnActivate(next, previous);
    }
  }

  export class PatientConsentCtrl {
    outcome: CalcStudyConsent;
    consents: CalcStudyConsent[];

    // @ngInject
    constructor(studyMembership: Models.StudyMember[],
                private personId: number,
                kinPatientConsent: PatientConsentService) {
      kinPatientConsent.calc(studyMembership)
        .then(result => {
          this.outcome = result.outcome;
          this.consents = result.consents;
        });
    }
  }

  export class PatientEditCtrl extends BaseEditCtrl<Models.Person> {
    public static resourceName = "person";

    addresses: Models.PersonAddress[];
    studyMembership: Models.StudyMember[];
    studyMember: Models.StudyMember;
    patientCaseList: GenModels.patientcase_uri[];
    patientCases: Models.PatientCase[];
    patientHasCase: Models.PatientHasCase[];

    duplicates: FindDuplicatesService;

    // @ngInject
    constructor(protected kinBaseEdit: BaseEditService<Models.Person>,
                private Restangular: restangular.IService,
                private kinStudies: StudiesService,
                private kinPatientConsent: PatientConsentService,
                private kinFindDuplicates: FindDuplicatesService) {
      super(kinBaseEdit);

      this.studyMember = null;
      this.studyMembership = [];
      this.patientCaseList = [];
      this.patientCases = [];
    }

    protected initItem(item: Models.Person): Models.Person {
      var init = (attr, val) => {
        if (angular.isUndefined(item[attr])) {
          item[attr] = val;
        }
      };

      init("dob_checked", true);
      init("dod_checked", true);

      return item;
    }

    protected itemLoaded(item: Models.Person): Models.Person {
      // setup duplicates service
      this.duplicates = this.kinFindDuplicates.find(item);

      // fetch and init patient address(es)
      this.loadAddresses(item)
        .then(addresses => {
          this.addresses = addresses;
        });

      this.s.$q.all([
        // fetch study membership list
        this.loadStudyMembership(item)
          .then(membership => {
            this.studyMembership = membership;
            this.studyMember = _.find(membership, { study: this.currentStudy.resource_uri });
            return this.studyMember;
          })
          .then(studyMember => {
            this.initRelations(this.item);
            if (studyMember) {
              this.kinPatientConsent.sortConsents(studyMember);
            }
            return studyMember;
          })
          .then(studyMember => this.loadPatientHasCase(studyMember)),

        // fetch list of patient cases for study
        this.loadStudyPatientCase()
      ])
        .then(([hasCase, patientCases]: [any[], Models.PatientCase[]]) => {
          this.patientCases = patientCases;

          if (angular.isUndefined(item.id)) {
            this.patientHasCase = this.initPatientHasCase(patientCases);
          } else {
            this.patientHasCase = hasCase;
          }

          this.patientCaseList = _(this.patientHasCase)
            .map("case").map(c => c["resource_uri"]).valueOf();
        });

      return item;
    }

    private loadAddresses(item: Models.Person) {
      var load = angular.isDefined(item.id) ? item.getAddresses()
        : this.s.$q.resolve([]);

      return load.then(addresses => {
        // Add a blank address if none exist
        if (addresses.length == 0) {
          this.s.kinDdl.get("addresstype")
            .then((types: Models.Any[]) => {
              var addresstype = _.first(types);
              addresses.push(<any>this.bless({
                person: item.resource_uri,
                type: addresstype ? addresstype.resource_uri : null,
                contact: this.bless({}, "contactdetails"),
              }, "personaddress"));
            });
        }
        return addresses;
      });
    }

    private loadStudyMembership(item: Models.Person) {
      if (angular.isDefined(this.item.id)) {
        return this.item.getStudyMembership();
      } else {
        return this.s.$q.resolve([]);
      };
    }

    private loadStudyPatientCase() {
      return this.s.kinDdl.get("patientcase", { study: this.currentStudy.id });
    }

    private loadPatientHasCase(studyMember: Models.StudyMember) {
      if (studyMember && angular.isDefined(studyMember.id)) {
        return this.Restangular.all("patienthascase").getList({ study_member: studyMember.id });
      } else {
        return this.s.$q.resolve([]);
      }
    }

    private initRelations(patient: Models.Person) {
      // Add a study membership for the current study, if none present
      if (!this.studyMember) {
        this.studyMember = <any>this.bless({
          study: this.currentStudy.resource_uri,
          patient: patient.resource_uri,
          consent_request_date: null,
          consents: []
        }, "studymember");
        this.studyMembership.push(this.studyMember);
      }

      // add an empty consent record if none exist yet
      if (this.studyMember.consents.length === 0) {
        this.studyMember.consents.push(<any>{
          study_member: this.studyMember.resource_uri,
          given: null,
          withdrawn: false,
          date: null,
          data: {}
        });
      }

      return patient;
    }

    private initPatientHasCase(patientCases: Models.PatientCase[]) {
      // set initial case to the default case(s) for this study
      return _(patientCases)
        .filter(c => !!c["default"])
        .map(patientCase => {
          return <Models.PatientHasCase>this.bless({
            'study_member': this.studyMember, // filled in when saving
            'case': patientCase
          }, "patienthascase");
        })
        .valueOf();
    }

    protected beforeSave(patient) {
      if (patient.title && patient.title.resource_uri) {
        patient.title = patient.title.resource_uri;
      }
      return patient;
    }

    private saveAddress(item: Models.Person) {
      var actions = _.map(this.addresses, personaddress => {
        var copy = this.copyElem(personaddress);
        copy.person = item.resource_uri;
        copy.contact = angular.copy(copy.contact);
        var c: any = copy.contact;
        if (c.suburb && c.suburb.resource_uri) {
          c.suburb = c.suburb.resource_uri;
        }
        if (c.suburb || c.address_line1 ||
            c.email || c.phone_home || c.mobile) {
          return copy.save();
        } else if (copy.id) {
          // delete personaddress if contact fields are empty
          return copy.remove();
        }
      });
      return this.s.$q.all(actions);
    }

    private saveStudyMember(item: Models.Person, member: Models.StudyMember): ng.IPromise<Models.StudyMember> {
      var isConsentEmpty = (c: Models.StudyConsent) => {
        return !c.status && _.every(c.data, _.isEmpty);
      };

      member.patient = item.resource_uri;
      _(member.consents)
        .map((c: Models.StudyConsent, i: number) => {
          // clean consent entry
          c.date = c.date || null;
          c.consented_by = c.consented_by || null;

          // note empty consent entries
          return isConsentEmpty(c) ? i : null;
        })
        .reverse()
        .each(i => {
          // delete empty consent entries
          if (_.isNumber(i)) {
            var uri = member.consents[i]["resource_uri"];
            if (uri) {
              this.Restangular.oneUrl("studyconsent", uri).remove();
            }
            delete member.consents[i];
          }
        }).valueOf();

      return member.save();
    }

    private savePatientHasCase(item: Models.Person, member: Models.StudyMember) {
      // do a collection diff
      var current = _(this.patientHasCase)
        .filter(phc => !!phc["id"])
        .map("case")
        .map("resource_uri")
        .compact()
        .valueOf();

      var toCreate = _.difference(this.patientCaseList, current);
      var toDelete = _.difference(current, this.patientCaseList);

      var deletes = _.map(this.patientHasCase, hasCase => {
        if (_.includes(toDelete, hasCase['case']['resource_uri'])) {
          return hasCase.remove();
        }
      });

      var posts = _.map(toCreate, resource_uri => {
        return this.Restangular.all("patienthascase").post({
          'study_member': member.resource_uri,
          'case': resource_uri
        });
      });

      return this.s.$q.all(_.concat(_.filter(deletes), posts));
    }

    protected afterSave(item: Models.Person) {
      return this.s.$q.all([
        this.saveAddress(item),
        this.saveStudyMember(item, this.studyMember)
          .then(studyMember => this.savePatientHasCase(item, studyMember))
      ]).then(() => item);
    }
  }

  export class PatientListCtrl {
    search: Searcher;
    $router: any;

    // @ngInject
    constructor(private kinSearcher: SearcherService,
                private kinStudies: StudiesService) {
    }

    $onInit() {
      this.search = this.kinSearcher.make('person', this.kinStudies.current);
    }

    // fixme: implement a row-sref attr in <kin-grid>
    rowSelect(item) {
      this.$router.navigate(["Detail", { id: item.id }]);
    }
  }

  export let PersonView: ng.IComponentOptions = {
    template: "<ng-outlet></ng-outlet>",
    $routeConfig: [
      {path: "/list",          name: "List",    component: "kinPersonListView", useAsDefault: true},
      {path: "/add",           name: "Add",     component: "kinPersonEditView"},
      {path: "/import",        name: "Import",  component: "kinPersonImportView"},
      {path: "/:id/event/...", name: "Event",   component: "kinPersonEventView"},
      {path: "/:id/edit",      name: "Edit",    component: "kinPersonEditView"},
      {path: "/:id/...",       name: "Detail",  component: "kinPersonDetailView"},
    ]
  };

  export let PersonListView: ng.IComponentOptions = {
    templateUrl: "app/patient/list.html",
    controllerAs: "vm",
    controller: "PatientListCtrl",
    bindings: { $router: "<" }
  };

  export let PersonDetailView: ng.IComponentOptions = {
    templateUrl: "app/patient/detail.html",
    $routeConfig: [
      {path: "/",        name: "Detail",  component: "kinPersonDetailStubView", useAsDefault: true},
      {path: "/consent", name: "Consent", component: "kinPersonConsentView"},
    ],
    controllerAs: "vm",
    controller: PatientDetailCtrl,
    bindings: { $router: "<" }
  };

  export let PersonDetailStubView: ng.IComponentOptions = {
  };

  export let PersonEditView: ng.IComponentOptions = {
    templateUrl: "app/patient/edit.html",
    controllerAs: "vm",
    controller: PatientEditCtrl,
    bindings: { $router: "<" }
  };

  export let PersonImportView: ng.IComponentOptions = {
    templateUrl: "app/patient/import-csv.html",
    bindings: { $router: "<" }
  };

  export let PersonConsentView: ng.IComponentOptions = {
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: class {
      $router: any;
      item: Models.Person;
      studyMembership: Models.StudyMember[];
      instance: ng.ui.bootstrap.IModalServiceInstance;

      // @ngInject
      constructor(private $uibModal: ng.ui.bootstrap.IModalService,
                  private Restangular: restangular.IService,
                  private kinRouteParams: RouteParamsService) {
      }

      $routerOnActivate(next) {
        return this.Restangular.all("studymember").getList({
          patient: this.kinRouteParams.params["id"],
          limit: 0
        }).then(studyMembership => {
          this.studyMembership = studyMembership;
          this.present();
        });
      }

      $routerOnDeactivate() {
        if (this.instance) {
          this.instance.dismiss();
          this.instance = null;
        }
      }

      private present() {
        var back = () => {
          this.$router.navigate(["Detail"]);
          this.instance = null;
        };

        this.instance = this.$uibModal.open({
          templateUrl: "app/patient/consent-modal.html",
          resolve: {
            studyMembership: () => this.studyMembership,
            personId: () => this.kinRouteParams.params["id"]
          },
          controller: PatientConsentCtrl,
          controllerAs: "vm"
        });
        return this.instance.result.then(back, back);
      }
    }
  };

  angular.module("kindred.patient.controllers", [
    "kindred.event.controllers",
    "kindred.event.directives"
  ])
    .controller("PatientDetailCtrl", PatientDetailCtrl)
    .controller("PatientEditCtrl", PatientEditCtrl)
    .controller("PatientListCtrl", PatientListCtrl)
    .controller("PatientConsentCtrl", PatientConsentCtrl)
    .component("kinPersonView", PersonView)
    .component("kinPersonListView", PersonListView)
    .component("kinPersonDetailView", PersonDetailView)
    .component("kinPersonDetailStubView", PersonDetailStubView)
    .component("kinPersonEditView", PersonEditView)
    .component("kinPersonImportView", PersonImportView)
    .component("kinPersonConsentView", PersonConsentView);
}
