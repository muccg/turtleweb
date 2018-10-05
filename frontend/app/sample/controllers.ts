module kindred {
  'use strict';

  export class SampleListCtrl {
    ctx: {
      container?: number;
    };
    levels: any[];
    container: Models.Container;
    search: Searcher
    ac: SearchAutoComplete;

    $router: any;

    // @ngInject
    constructor($scope: ng.IScope,
                public kinContainers: ContainersService,
                kinSearcher: SearcherService,
                public kinSavedSearch: SavedSearchService) {
      this.ctx = {};
      this.search = kinSearcher.make('sample', null, this.ctx);

      kinContainers.load();

      this.levels = [];
      this.container = null;

      $scope.$watch("vm.container", (cnt: Models.Container) => {
        this.ctx.container = cnt ? cnt.id : null;
        this.search.refresh();
      });
    }

    clearSearch() {
      // fixme: can't clear levels
      this.levels.splice(1);
      this.container = null;

      this.search.clearAndRefresh();
    }

    canClearSearch() {
      return !this.search.is_blank() || this.container;
    }

    sampleSelect(sampleId?: number) {
      if (_.isNumber(sampleId)) {
        this.$router.navigate(["../../Sample/Detail", { id: sampleId }]);
      }
    }

    submit() {
      var singleResult = this.search.checkRepeatedSearch();
      if (singleResult) {
        this.sampleSelect(singleResult.id);
      } else {
        this.search.search().then(() => {
          if (this.ac) {
            this.ac.hide();
          }
        });
      }
    }
  }

  export class SampleDetailCtrl extends BaseDetailCtrl<Models.Sample> {
    static resourceName = "sample";

    owner: Models.Person;
    pevent: Models.Event;
    estudy: Models.Study;

    // @ngInject
    constructor(kinBaseEdit, private kinStudies: StudiesService) {
      super(kinBaseEdit);
    }

    getMoreDeps(item: Models.Sample) {
      return this.s.$q.all([
        this.findOwner(item),
        this.findCollection(item)
      ]);
    }

    private findOwner(item) {
      return item.getOwner().then(owner => {
        this.owner = owner;
      });
    }

    private findCollection(item) {
      return item.getCollectionEvent()
        .then(pevent => {
          this.pevent = pevent;
          this.estudy = pevent ? this.kinStudies.getByUri(pevent.study) : null;
        });
    }

    refresh(xact) {
      this.item.get().then(update => this.load(update));
    }
  }

  export class SampleEditCtrl extends BaseEditCtrl<Models.Sample> {
    static resourceName = "sample";

    transaction: Models.SampleCollection;
    pevent: Models.Event;
    study: Models.Study;
    sampleCount: number;
    items: Models.Sample[];
    person: Models.Person;
    processedDate: string;
    frozenFixedDate: string;
    exists: boolean;
    sampleClasses: Models.SampleClass[];

    units = [
      { header: "Mass" },
      { unit: "kg" },
      { unit: "g" },
      { unit: "mg" },
      { unit: "µg" },
      { header: "Volume" },
      { unit: "L" },
      { unit: "mL" },
      { unit: "µL" },
      { header: "Count" },
      { unit: "pcs" },
      { unit: "vials" }
    ];

    // @ngInject
    constructor(kinBaseEdit: BaseEditService<Models.Sample>,
                protected kinDateTimeUtil: DateTimeUtilService,
                public kinContainers: ContainersService,
                protected kinSampleFix: SampleFixService,
                protected kinStudies: StudiesService) {
      super(kinBaseEdit);
      this.sampleClasses = this.s.kinDdl.get<Models.SampleClass>("sampleclass").$object;
    }

    private getTransaction(item: Models.Sample, name: string, attr?: string): any {
      return _(item.transactions)
        .filter(x => x[name])
        .map(attr || _.identity)
        .first();
    }

    protected load(item: Models.Sample): Models.Sample {
      var copy = super.load(item);
      this.items = [copy];
      this.exists = !!item.location;
      return copy;
    }

    protected getMoreDeps(item: Models.Sample) {
      var reqs: any = {};

      if (item.id) {
        var xact = item.getCollection();
        if (xact) {
          this.transaction = <any>this.bless(xact.samplecollection, "samplecollection");
          reqs.event = this.fetchEvent()
            .then(pevent => {
              this.pevent = pevent;
              this.pevent.study = this.kinStudies.getByUri(pevent.study);
            });
        }
        this.processedDate = this.getTransaction(item, "sampleprocessed", "date");
        this.frozenFixedDate = this.getTransaction(item, "samplefrozenfixed", "date");

        reqs.person = this.s.Restangular.oneUrl("person", <string>item.owner).get().then(owner => {
          this.person = owner;
        });
      }

      return this.s.$q.all(reqs).then(() => item);
    }

    protected fetchEvent() {
      return this.s.Restangular.oneUrl("event", <string>this.transaction.event).get();
    }

    protected beforeSave(item) {
      this.kinSampleFix.fixUris(item);
      if (item.location) {
        delete item.location.resource_uri;
      }
      delete item.transactions; // will save these later
      return item;
    }

    protected afterSave(item: Models.Sample): PromisePerhaps<Models.Sample> {
      return this.saveTransactions(item).then(() => item.get());
    }

    protected redirectRoute(item): any[] {
      // fixme: this redirect should really depend on where editing
      // came from.
      if (this["fixmeCameFromPersonPage"]) {
        // back to owner person detail
        var study = <Models.Study>this.pevent.study;
        return ["/App/Studies", { study: study.slug},
                "Person/Detail", { id: this.person.id }];
      } else {
        // back to biobank sample
        return ["/App/Biobank/Sample/Detail", { id: item.id }];
      }
    }

    protected saveTransactions(item: Models.Sample|string) {
      return this.s.$q.all(_.filter([
        typeof item !== "string" ? this.saveCollectionTransaction(item) : null,
        this.saveDateTransaction(item, "processed", "P"),
        this.saveDateTransaction(item, "frozenFixed", "F")
      ]));
    }

    protected saveCollectionTransaction(item: Models.Sample) {
      var previous = item.getCollection();
      if (this.transaction && previous && previous.id &&
          !this.kinDateTimeUtil.apiDateTimeSame(previous.date, this.transaction.date)) {
        return this.transaction.save();
      }
    }

    protected saveDateTransaction(item: Models.Sample|string, name: string, type: string) {
      var date = this[name + "Date"];
      var resourceName = "sample" + name.toLowerCase();
      var resource = this.s.Restangular.all(resourceName);
      var xact = typeof item === "string" ? null
        : this.bless(this.getTransaction(item, resourceName), resourceName);

      if (xact && !date) {
        // delete transaction
        return xact.remove();
      } else if (!xact && date) {
        // create new transaction entry
        return resource.post({
          sample: typeof item === "string" ? item : item.resource_uri,
          type: type,
          date: date
        });
      } else if (xact && date && !this.kinDateTimeUtil.apiDateTimeSame(xact["date"], date)) {
        // update transaction
        xact["date"] = date;
        return xact.save();
      } else {
        // nothing to do
        return null;
      }
    }

    isClean() {
      var orig = angular.copy(this.orig), item = angular.copy(this.item);
      if (item.location && item.location.container &&
          item.location.container["resource_uri"]) {
        item.location.container = item.location.container["resource_uri"];
      }
      // fixme: ignoring transactions ... too hard
      delete orig.transactions;
      delete item.transactions;
      return angular.equals(orig, item);
    }

    onPick(coord: any, index: number, picks: any[]) {
      // nothing to do, ngModel handles it
    }
  }

  export class SampleAddCtrl extends SampleEditCtrl {
    // @ngInject
    constructor(kinBaseEdit: BaseEditService<Models.Sample>,
                protected kinDateTimeUtil: DateTimeUtilService,
                kinContainers: ContainersService,
                kinSampleFix: SampleFixService,
                kinStudies: StudiesService,
                private kinUserPrefs: UserPrefsService) {
      super(kinBaseEdit, kinDateTimeUtil, kinContainers, kinSampleFix, kinStudies);
    }

    protected getDeps(params: {}) {
      return this.s.Restangular.one("event", params["eventId"]).get()
        .then(event => {
          this.pevent = event;
          this.pevent.study = this.kinStudies.getByUri(event.study);
        });
    }

    protected getItem(params: {}) {
      var sample = {
        location: {
          container: null,
          x: 0,
          y: 0,
          z: 0
        },
        cls: null,
        amount: 1.0,
        concentration: 1.0,
        owner: params["id"]
      };
      return this.s.getItem(this.getResourceName(), params, null, sample);
    }

    protected getMoreDeps(item: Models.Sample) {
      var transaction = {
        type: "C",
        sample: item,
        date: this.kinDateTimeUtil.defaultNow(null),
        comment: "",
        event: this.pevent
      };
      this.transaction = <any>this.s.Restangular.restangularizeElement(null, transaction, "samplecollection");
      this.exists = false;

      return this.s.Restangular.one("person", <string>item.owner).get().then(owner => {
        this.person = owner;
        return item;
      });
    }

    private saveSampleLocation(location) {
      if (location && location.container) {
        if (location.container.resource_uri) {
          location.container = location.container.resource_uri;
        }
        this.kinUserPrefs.update("mruContainer", location.container);
        if (!location.id) {
          location = this.s.Restangular.restangularizeElement(null, location, "samplelocation");
        }
        return location.save();
      } else {
        return new this.s.$q(function(resolve) { resolve(null); });
      }
    }

    private saveFirstTransaction(xact) {
      this.kinSampleFix.fixUris(xact.sample);

      return this.saveSampleLocation(xact.sample.location)
        .then(location => {
          var horrible = function(location) {
            return location.resource_uri.replace("/samplelocation", "/briefsamplelocation");
          };
          xact.sample.location = location ? horrible(location) : null;
          this.kinContainers.setInvalid(); // refreshes sample counts
          return xact.save();
        });
    }

    private makeTransaction(templateTransaction: Models.SampleCollection) {
      var ev = templateTransaction.event["resource_uri"] || templateTransaction.event;
      return (sample) => {
        var s = this.s.Restangular.restangularizeElement(null, angular.copy(sample), "sample");
        var xact = _.assign({}, templateTransaction, { sample: s, event: ev });
        return <Models.SampleCollection>this.s.Restangular.restangularizeElement(null, xact, "samplecollection");
      };
    }

    private allStoredIn(xacts: Models.SampleCollection[]) {
      _.each(xacts, xact => {
        var sample = <Models.Sample>xact.sample;
        sample.stored_in = this.item.stored_in;
      });
    }

    protected doSave(item: Models.Sample) {
      // sample add actually saves transaction(s) rather than a sample
      var xacts = _.map(this.items, this.makeTransaction(this.transaction));
      this.allStoredIn(xacts);
      var saveAll = _.reduce(xacts, (prev, xact) => {
        return prev.then(xacts => {
          return this.saveFirstTransaction(xact)
            .then(updated => {
              xacts.push(updated);
              return xacts;
            });
        });
      }, this.s.$q.resolve([]));
      return saveAll.then((transactions: Models.Transaction[]) => {
        // now create other transactions
        var sampleUris = <string[]>_.map(transactions, "sample");
        return this.s.$q.all(_.map(sampleUris, uri => this.saveTransactions(uri)))
          .then(() => this.s.Restangular.oneUrl("sample", sampleUris[0]).get());
      });
    }

    protected afterSave(item: Models.Sample) {
      return item;
    }

    private fillEmptySamples() {
      var ref;
      _.each(this.items, (item, i) => {
        if (_.isUndefined(item)) {
          item = this.items[i] = <Models.Sample>{};
        }

        // use the first item as a template for new items
        if (ref) {
          if (!item.cls) {
            item.cls = ref.cls;
          }
          if (!item.subtype) {
            item.subtype = ref.subtype;
          }
          if (!item.treatment) {
            item.treatment = ref.treatment;
          }
          if (!item.behaviour) {
            item.behaviour = ref.behaviour;
          }
          if (!item.amount) {
            item.amount = ref.amount;
          }
          if (!item.display_unit) {
            item.display_unit = ref.display_unit;
          }
          if (!item.concentration) {
            item.concentration = ref.concentration;
          }
        } else {
          ref = item;
        }
      });
    }

    updateSampleCount() {
      this.fillEmptySamples();
    }

    onPick(coord: any, index: number, picks: any[]) {
      this.items[index].location = coord;
    }
  }

  export class SampleFixService {
    private related = ["cls", "subtype", "stored_in", "treatment",
                       "behaviour", "dna_extraction_protocol"];
    private flatten(ob, attr) {
      if (ob && ob[attr] && ob[attr].resource_uri) {
        ob[attr] = ob[attr].resource_uri;
      }
    }

    fixUris(sample: Models.Sample) {
      _.each(this.related, attr => this.flatten(sample, attr));
      this.flatten(sample.location, "container");
      return sample;
    }
  }

  export let BiobankView: ng.IComponentOptions = {
    template: '<ng-outlet></ng-outlet>',
    $routeConfig: [
      {path: '/sample/...',    name: 'Sample',   component: 'kinSampleView', useAsDefault: true},
      {path: '/container/...', name: 'Container', component: 'kinContainerView'}
    ]
  };

  export let SampleView: ng.IComponentOptions = {
    template: '<ng-outlet></ng-outlet>',
    $routeConfig: [
      {path: '/list',     name: 'List',   component: 'kinSampleListView', useAsDefault: true},
      {path: '/:id',      name: 'Detail', component: 'kinSampleDetailView'},
      {path: '/:id/edit', name: 'Edit',   component: 'kinSampleEditView'}
    ]
  };

  export let SampleListView: ng.IComponentOptions = {
    templateUrl: "app/sample/list.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: SampleListCtrl
  };

  export let SampleDetailView: ng.IComponentOptions = {
    templateUrl: "app/sample/detail.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: SampleDetailCtrl
  };

  export let SampleEditView: ng.IComponentOptions = {
    templateUrl: "app/sample/edit.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: SampleEditCtrl
  };

  export let SampleAddView: ng.IComponentOptions = {
    templateUrl: "app/sample/edit.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: SampleAddCtrl
  };

  export let ContainerView: ng.IComponentOptions = {
    template: '<ng-outlet></ng-outlet>',
    $routeConfig: [
      {path: '/list',     name: 'List',   component: 'kinContainerListView', useAsDefault: true},
      {path: '/:id',      name: 'Detail', component: 'kinContainerDetailView'},
      {path: '/:id/edit', name: 'Edit',   component: 'kinContainerEditView'}
    ]
  };

  export let ContainerListView: ng.IComponentOptions = {
    templateUrl: "app/sample/container-list.html",
    bindings: { $router: "<" },
    controllerAs: "vm",
    controller: SampleListCtrl
  };

  angular.module('kindred.sample.controllers', [])
    .component("kinBiobankView", BiobankView)
    .component("kinSampleView", SampleView)
    .component("kinSampleListView", SampleListView)
    .component("kinSampleDetailView", SampleDetailView)
    .component("kinSampleEditView", SampleEditView)
    .component("kinSampleAddView", SampleAddView)
    .component("kinContainerView", ContainerView)
    .component("kinContainerListView", ContainerListView)
    .controller('SampleListCtrl', SampleListCtrl)
    .controller('SampleDetailCtrl', SampleDetailCtrl)
    .controller("SampleAddCtrl", SampleAddCtrl)
    .service('kinSampleFix', SampleFixService)
    .controller('SampleEditCtrl', SampleEditCtrl);
}
