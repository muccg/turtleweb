module kindred {
  'use strict';

  export type ContainersPromise = ng.IPromise<ContainersService>;

  export interface ContainerProps {
    terminal?: boolean; // no child containers
    holdsSamples?: boolean; // can hold samples
    needsCoord?: boolean; // samples have a position within container
  }

  export type Tree<T> = T & { children: Tree<T>[] };
  export type Forest<T> = Tree<T>[];

  /* This service caches containers because they take a little while
   * to load.
   * It also arranges the list of containers into a tree structure.
   * TODO: Need to implement proper caching across the app models.
   */
  export class ContainersService {
    private promise: ContainersPromise;

    // list of containers and container classes from server
    containers: Models.Container[];
    classes: Models.ContainerClass[];
    // mapping from resource_uri to container
    containerUri: {
      [index: string]: Models.Container;
    };
    // mapping from resource_uri to container class
    classUri: {
      [index: string]: Models.ContainerClass;
    };
    // containers and classes arranged into a list of trees
    tree: Forest<Models.Container>;
    clsTree: Forest<Models.ContainerClass>;
    // the first container class in the tree
    rootCls: Models.ContainerClass;

    // @ngInject
    constructor(private $q: ng.IQService, private Restangular: restangular.IService) {
    }

    private startLoad() {
      return this.$q.all({
        containers: this.Restangular.all("container").getList(),
        classes: this.Restangular.all("containerclass").getList()
          .then(ContainersService.topoSortCls)
      }).then((r: { containers: Models.Container[], classes: Models.ContainerClass[] }) => {
        _.assign(this, r);
        this.containerUri = _.keyBy(r.containers, "resource_uri");
        this.classUri = _.keyBy(r.classes, "resource_uri");

        this.tree = this.findChildren("container", r.containers, null);
        this.clsTree = this.findChildren("contained_by", r.classes, null);
        this.rootCls = this.clsTree[0];
      });
    }

    private static topoSortCls(items: Models.ContainerClass[]) {
      var sorted = [];
      var uriMap = _.keyBy(items, "resource_uri");
      var seen = {};
      var follow = (resource_uri: string) => {
        if (!seen[resource_uri]) {
          seen[resource_uri] = true;
          _.each(items, item => {
            if (item.contained_by === resource_uri) {
              sorted.push(item);
              follow(item.resource_uri);
            }
          });
        }
      };
      follow(null);
      return sorted;
    }

    private findChildren<T>(parentAttr: string, containers: T[], container: T): Forest<T> {
      return _(<Forest<T>>containers)
        .filter(c => (c[parentAttr] === container))
        .sortBy(["order", "id"])
        .map(child => {
          child.children = this.findChildren(parentAttr, containers, child["resource_uri"]);
          return child;
        })
        .value();
    }

    load(): ContainersPromise {
      if (!this.promise) {
        this.promise = this.startLoad().then(_.constant(this));
      }
      return this.promise;
    }

    getClass(container: Models.Container): Models.ContainerClass {
      var cls = _.filter(this.classes, { contained_by: container.cls });
      return cls.length ? cls[0] : null;
    }

    private forceContainer(container: string|Models.Container): Models.Container {
      // fixme: too lax, need to be sure of the types
      return (typeof container === "string")
        ? this.containerUri[container]
        : container;
    }

    containerProps(container: string|Models.Container): ContainerProps {
      var c = this.forceContainer(container);
      if (c) {
        var cls = this.classUri[<string>c.cls];
        return {
          terminal: cls["children"].length === 0,
          holdsSamples: cls.dim > 0 &&
            (c.width + c.height + c.depth > 0),
          needsCoord: cls.dim > 0 &&
            (c.width * c.height * c.depth > 0)
        };
      } else {
        return {};
      }
    }

    setInvalid() {
      this.promise = null;
    }

    refresh() {
      this.setInvalid();
      return this.load();
    }

    findContainerTrail(containerUri: GenModels.container_uri): Models.Container[] {
      var trail = [];
      var follow = containerUri => {
        var container = this.containerUri[containerUri];
        if (container) {
          trail.push(container);
          follow(container.container);
        }
        return trail;
      };
      return follow(containerUri).reverse();
    }

    findContainerClassUriTrail(cls: Models.ContainerClass): GenModels.containerclass_uri[] {
      var trail = [];
      while (cls) {
        trail.push(cls.resource_uri);
        cls = this.classUri[<string>cls.contained_by];
      }
      return trail;
    }

    /**
     * Fetch the samples for a container and keep the result cached.
     */
    fetchSamples(cnt: Models.Container): ng.IPromise<Models.ContainerSample[]> {
      if (!cnt.samples) {
        return this.Restangular.one("container", cnt.id).get().then(update => {
          return (cnt.samples = update.samples);
        });
      }
      return this.$q.resolve(cnt.samples);
    }
  }

  class EditTransactionCtrl {
    saving: boolean;
    sampleClasses: Models.SampleClass[];

    subdivisions: {
      cls: Models.SampleClass;
      subtype: Models.SampleSubtype;
    }[];

    // @ngInject
    constructor(public item: Models.Transaction,
                private $uibModalInstance,
                private Restangular: restangular.IService,
                private kinDdl: DdlService,
                private kinConfirm: ConfirmService,
                private kinContainers: ContainersService) {
      if (item.type === 'A') {
        this.subdivisions = [];
        this.sampleClasses = kinDdl.get<Models.SampleClass>("sampleclass").$object;
      }
    }

    save() {
      this.saving = true;
      this.saveTransaction(this.item)
        .then(transaction => {
          this.$uibModalInstance.close(transaction);
        }, () => {
          this.saving = false;
        });
    }

    private saveTransaction(transaction): ng.IPromise<Models.Transaction>  {
      var copy = transaction.clone();
      copy.fromServer = transaction.fromServer;
      copy.sample = (<Models.Sample>copy.sample).resource_uri;

      if (copy.to) {
        if (copy.to.container && copy.to.container.resource_uri) {
          copy.to.container = copy.to.container.resource_uri;
        }
      }
      if (copy.fro && !copy.fro.container) {
        copy.fro = null;
      }

      this.addExtraAttrs(copy);

      return copy.save();
    }

    canDelete() {
      var deletable = ["", "P", "F", "U", "D", "X", "M"];
      return _.includes(deletable, this.item.type);
    }

    confirmDelete() {
      this.kinConfirm.ask({
        title: "Delete Transaction",
        msg: "Are you sure?",
        action: "Yes, Delete"
      }).then(() => {
        this.saving = true;
        this.Restangular.one("transaction", this.item.id).remove().then(() => {
          this.$uibModalInstance.close();
        }, () => {
          this.saving = false;
        });
      });
    }

    subdivisionCountChanged() {
      if (_.isNumber(this.item["count"])) {
        var filler = _.last(this.subdivisions) ||
          _.pick(this.item.sample, ["cls", "subtype"]);
        this.subdivisions.length = this.item["count"];
        for (var i = 0; i < this.subdivisions.length; i++) {
          if (!this.subdivisions[i]) {
            this.subdivisions[i] = <any>_.clone(filler);
          }
        }
      }
    }

    private addExtraAttrs(xact: any) {
      if (this.subdivisions) {
        xact.extra_attrs = _.map(this.subdivisions, subdiv => {
          return {
            cls_id: subdiv.cls.id,
            subtype_id: subdiv.subtype.id
          };
        });
      }
    }
  }

  export class TransactionModalService {
    typeResource = {
      C: "samplecollection",
      P: "sampleprocessed",
      F: "samplefrozenfixed",
      U: "sampleuse",
      D: "sampledestroy",
      X: "samplesending",
      M: "samplemove",
      S: "samplesubdivision",
      A: "samplesplit",
      J: "samplesubcultured",
      K: "samplesubculturedfrom",
      "": "samplenote"
    };

    // @ngInject
    constructor(private Restangular: restangular.IService,
                private kinContainers: ContainersService,
                private $uibModal: ng.ui.bootstrap.IModalService) {
    }

    private makeTransaction(sample: Models.Sample, xtype: string): Models.Transaction {
      var xact = {
        date: moment().toISOString(),
        comment: "",
        "type": xtype,
        sample: sample,
        to: undefined,
        fro: undefined,
        total_amount: undefined,
        amount: undefined
      };
      if (xtype === "M") {
        xact.to = this.copyLocation(<any>sample.location);
        xact.fro = this.copyLocation(<any>sample.location);
      }
      if (xtype === "U" || xtype === "X") {
        xact.amount = sample.amount;
      }
      if (xtype === "A") {
        xact.total_amount = sample.amount;
      }
      var resource = this.typeResource[xtype];
      return <any>this.Restangular.restangularizeElement(null, xact, resource);
    }

    private copyLocation(loc: Models.SampleLocation) {
      return loc ? {
        container: loc.container,
        x: loc.x, y: loc.y, z: loc.z
      } : {};
    }

    private openModal(xact: Models.Transaction) {
      return this.$uibModal.open({
        templateUrl: "app/sample/edit-transaction-modal.html",
        controller: EditTransactionCtrl,
        controllerAs: 'vm',
        resolve: {
          item: xact
        }
      }).result;
    }

    public add(sample: Models.Sample, xtype: string) {
      var xact = this.makeTransaction(sample, xtype);
      return this.openModal(xact);
    }

    public edit(sample: Models.Sample, xact: Models.Transaction) {
      var resource = this.typeResource[xact.type];
      var elem = angular.copy(xact.type ? xact[resource] : xact);
      var copy = <Models.Transaction>
        this.Restangular.restangularizeElement(null, elem, resource);
      copy["fromServer"] = true;
      copy.sample = sample;
      return this.openModal(copy);
    }
  }

  export class BiobankUrlsService {
    label: (id: string|GenModels.sample_id, params?: {}) => string;
    qrcode: (id: string|GenModels.sample_id, params?: {}) => string;

    // @ngInject
    constructor(private appConfig: AppConfig, private $httpParamSerializer) {
      var svgUrl = function(url) {
        return function(sampleId, params?) {
          var q = _.isEmpty(params) ? "" : ("?" + $httpParamSerializer(params));
          return url.replace(/0.svg$/, sampleId + ".svg" + q);
        };
      };
      this.label = svgUrl(appConfig.urls["sample_label"]);
      this.qrcode = svgUrl(appConfig.urls["sample_qrcode"]);
    }

    printLabels(ids: GenModels.sample_id[]): string {
      var q = this.$httpParamSerializer({ id: ids });
      return this.appConfig.urls["sample_labels_print"] + "?" + q;
    }
  }

  export interface LabelPrintStorage {
    ids: GenModels.sample_id[];
  }

  export class LabelPrintService {
    labels: LabelPrintStorage;

    // @ngInject
    constructor($localStorage, private kinBiobankUrls: BiobankUrlsService) {
      this.labels = $localStorage.$default({ ids: [] });
    }

    add(sample: Models.Sample) {
      if (!_.includes(this.labels.ids, sample.id)) {
        this.labels.ids.push(sample.id);
      }
    }

    getLabelsUrl(): string {
      return this.kinBiobankUrls.printLabels(this.labels.ids);
    }

    getPreviewUrls(borders: boolean): string[] {
      var q = borders ? { borders: 1 } : null;
      return _.map(this.labels.ids, id => {
        return this.kinBiobankUrls.label(id, q);
      });
    }
    clear() {
      this.labels.ids.splice(0, this.labels.ids.length);
    }
  }

  angular.module('kindred.sample.services', ["ngStorage"])
    .service("kinContainers", ContainersService)
    .service("kinTransactionModal", TransactionModalService)
    .service("kinBiobankUrls", BiobankUrlsService)
    .service("kinLabelPrint", LabelPrintService);
}
