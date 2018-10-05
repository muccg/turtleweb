module kindred {
  'use strict';

  export class DdlEditDirectiveCtrl {
    items: restangular.ICollection;
    unsortedItems: restangular.ICollection;
    ui = {
      edit: null,
      editCopy: null
    };

    /** modified flag for collection, cheaper than comparing each item */
    private dirty;

    // @ngInject
    constructor(protected $scope,
                protected kinCollection: CollectionService,
                protected kinDdl: DdlService,
                protected Restangular: restangular.IService) {
    }

    setUnsortedItems(items: restangular.ICollection) {
      if (items) {
        this.unsortedItems = items;
        this.items = this.kinCollection.sortCloneCollection(items);
        this.dirty = false;
      }
    }

    save() {
      var copy = this.kinCollection.cloneCollection(this.items);
      var items = this.beforeSave(copy);
      return this.kinCollection.save(this.unsortedItems, items, this.eqFunc()).then(() => {
        // refresh the collection for editing
        var listId = this.$scope.list ? this.$scope.list.id : undefined;
        this.unsortedItems.getList({ limit: 0, list: listId }).then((items: restangular.ICollection) => {
          this.setUnsortedItems(this.afterSave(items));
        });

        // refresh the collection for rest of app
        this.kinDdl.dropCache(listId || this.unsortedItems["route"]);
      });
    }

    isClean() {
      if (this.items && this.items.length < 200) {
        return this.kinCollection.isEqual(this.unsortedItems, this.items, this.eqFunc());
      } else {
        return !this.dirty;
      }
    }

    private updateDirty(dirty: boolean) {
      this.dirty = this.dirty || dirty;
    }

    protected eqFunc() {
      return angular.equals;
    }

    beforeSave(items: restangular.ICollection): restangular.ICollection {
      return items;
    }
    afterSave(items: restangular.ICollection): restangular.ICollection {
      return items;
    }

    makeItem(initial: {}): restangular.IElement {
      return this.bless(_.assign({}, initial, {
        name: "",
        order: this.getInitOrder(this.items)
      }));
    }

    protected getInitOrder(items) {
      var last = items.length ? items[items.length - 1] : null;
      return (last ? (last.order || items.length) : 0) + 1;
    }

    protected bless(item) {
      var resource = this.items["route"];
      return this.Restangular.restangularizeElement(null, item, resource, false);
    }

    startEdit(item) {
      this.ui.edit = item;
      this.ui.editCopy = angular.copy(item);
    }

    finishEdit(item, updated) {
      this.updateDirty(!this.kinCollection.isItemEqual(item, updated, this.eqFunc()));
      _.assign(item, updated);
      this.ui.edit = null;
      this.ui.editCopy = null;
    }

    cancelEdit(item, updated) {
      // cull item if it's brand new
      if (item === updated) {
       this.deleteItem(item);
      }
      this.ui.edit = this.ui.editCopy = null;
    }

    addItem(initial) {
      var item = this.makeItem(initial);
      this.items.push(item);
      this.ui.edit = item;
      this.ui.editCopy = item;
      this.updateDirty(true);
    }
    deleteItem(item) {
      this.items.splice(_.indexOf(this.items, item), 1);
      this.updateDirty(true);
    }

    hasPlaceholder() {
      return _.some(this.items, (item: any) => {
        return _.isEmpty(item.name) && _.isUndefined(item.id);
      });
    }

    /**
     * Called to renumber the item order when items have been
     * reordered with drag&drop.
     */
    updateItemOrder(moved: { order: number }) {
      var prevOrder = _.map(this.items, "order");
      this.baseUpdateItemOrder(moved);
      var order = _.map(this.items, "order");
      this.updateDirty(!_.isEqual(prevOrder, order));
    }

    protected baseUpdateItemOrder(moved: { order: number }) {
      _.each(this.items, (item: { order: number }, index: number) => {
        item.order = index + 1;
      });
    }
  }

  // @ngInject
  function ddlEditDirective() {
    return {
      restrict: 'E',
      templateUrl: 'app/admin/ddl-edit/ddl-edit.html',
      scope: {
        unsortedItems: '=items',
        ctrl: '=?',
        list: '=?'
      },
      controller: DdlEditDirectiveCtrl,
      controllerAs: 'vm',
      link: function(scope, elem, attrs, ctrl: DdlEditDirectiveCtrl) {
        // expose controller to user of directive
        scope.ctrl = ctrl;

        scope.$watch("unsortedItems", function(items) {
          ctrl.setUnsortedItems(items);
        });

        scope.toggleDefault = function(item) {
          var def = !item["default"];
          _.each(ctrl.items, function(x) {
            x["default"] = false;
          });
          item["default"] = def;
        };

        scope.sortableOptions = {
          axis: "y",
          handle: "> .dragHandle",
          stop: (e, ui) => ctrl.updateItemOrder(ui.item.sortable.model)
        };

        // fixme: add self-destruct on new items which were blurred
        // and left empty
      }
    };
  }

  class StudyEditDirectiveCtrl extends DdlEditDirectiveCtrl {
    // @ngInject
    constructor($scope, kinCollection, kinDdl, Restangular,
                private kinStudies: StudiesService) {
      super($scope, kinCollection, kinDdl, Restangular);
    }

    makeItem(): restangular.IElement {
      return <any>_.assign(super.makeItem({}), {
        slug: "",
        desc: ""
      });
    }

    toggleStudyArchive(study) {
      study.archived = study.archived ? null : moment().format();
    }

    afterSave(items) {
      this.kinStudies.refresh();
      return items;
    }
  }

  // @ngInject
  function studyEditDirective(kinCollection: CollectionService) {
    return {
      restrict: 'E',
      templateUrl: 'app/admin/ddl-edit/study-edit.html',
      scope: {
        unsortedItems: '=items',
        ctrl: '=?'
      },
      controller: StudyEditDirectiveCtrl,
      controllerAs: 'vm',
      link: function(scope, elem, attrs, ctrl: StudyEditDirectiveCtrl) {
        // expose controller to user of directive
        scope.ctrl = ctrl;

        scope.$watch("unsortedItems", function(items) {
          ctrl.setUnsortedItems(items);
        });

        scope.sortableOptions = {
          axis: "y",
          handle: "> .thumbnail-study-admin > .caption.study",
          stop: (e, ui) => ctrl.updateItemOrder(ui.item.sortable.model)
        };
      }
    };
  }

  class EventTypeEditDirectiveCtrl extends DdlEditDirectiveCtrl {
    // @ngInject
    constructor($scope, kinCollection,
                kinDdl: DdlService,
                Restangular: restangular.IService,
                private kinEventTypes: EventTypesService,
                private kinStudies: StudiesService) {
      super($scope, kinCollection, kinDdl, Restangular);
    }

    setUnsortedItems(items) {
      this.unsortedItems = items;
      this.kinEventTypes.load().then(() => {
        // Deep-clone and topo-sort the items collection
        var tree = this.kinEventTypes.annotateTree(items, "super_type")
        var sorted = _.map(tree.items, (item: RestangularElement) => {
          var copy = <RestangularElement>item.clone();
          copy.fromServer = item.fromServer;
          return copy;
        });
        if (items) {
          this.items = this.Restangular.restangularizeCollection(null, sorted, items.route);
        }
      });
    }

    deleteItem(item) {
      this.items.splice(_.indexOf(this.items, item), 1);
    }

    addItem(initial) {
      this.items.push({
        name: "",
        order: this.getInitOrder(this.items),
        depth: 0,
        studyEnabled: this.toStudyMap([])
      });
    }

    private findPrev(index: number) {
      while (index-- > 0) {
        var prev = this.items[index];
        if (angular.isDefined(prev.id)) {
          return prev;
        }
      }
      return null;
    }

    hasPlaceholder() {
      return _.map(this.items, "name").some(_.isEmpty);
    }

    canDeindent(item) {
      return item.depth > 0;
    }

    canIndent(item, index) {
      var prev = this.findPrev(index);
      return prev && item.depth <= prev.depth;
    }

    deindent(item) {
      item.depth = (item.depth || 0) - 1;
    }

    indent(item) {
      item.depth = (item.depth || 0) + 1;
    }

    private toStudyMap(studies) {
      return _.reduce(this.kinStudies.studies, (result, study: Models.Study) => {
        result[study.resource_uri] = !studies ||
          studies.length === 0 ||
          _.includes(studies, study.resource_uri);
        return result;
      }, {});
    }

    private fromStudyMap(studyEnabled) {
      var studies = _.reduce(studyEnabled, (result, enabled, uri) => {
        if (enabled) {
          result.push(uri);
        }
        return result;
      }, []);
      if (studies.length === this.kinStudies.studies.length) {
        studies = [];
      }
      return studies;
    }

    private setupStudyGrid(items) {
      _.each(items, (item: any) => {
        item.studyEnabled = this.toStudyMap(item.studies);
      });
    }

    private processStudyGrid(items) {
      return _.each(items, (item: any) => {
        item.studies = this.fromStudyMap(item.studyEnabled);
        delete item.studyEnabled;
      });
    }

    protected eqFunc() {
      // equality check mutates objects but they are copies anyway
      return (a, b) => {
        _.each(["super_type", "parent", "depth"], prop => {
          delete a[prop];
          delete b[prop];
        });
        return angular.equals(a, b);
      };
    }

    beforeSave(items) {
      // filter blank items
      _.remove(items, item => !item["name"]);
      // go through and translate depth into super_type field
      this.kinEventTypes.unannotateTree(items, "super_type", "parent", "depth");
      this.processStudyGrid(items);
      return items;
    }

    afterSave(items) {
      this.kinEventTypes.refresh();
      return items;
    }
  }

  // @ngInject
  function eventTypeEditDirective(Restangular: restangular.IService, kinEventTypes) {
    return {
      restrict: 'E',
      templateUrl: 'app/admin/ddl-edit/event-type-edit.html',
      scope: {
        unsortedItems: '=items',
        ctrl: '=?'
      },
      controller: EventTypeEditDirectiveCtrl,
      controllerAs: 'vm',
      link: function(scope, elem, attrs, ctrl) {
        // expose controller to user of directive
        scope.ctrl = ctrl;

        scope.$watch("unsortedItems", function(items) {
          ctrl.setUnsortedItems(items);
        });

        scope.sortableOptions = {
          axis: "y",
          handle: "> .drag-handle",
          // connectWith: ".apps-container",
          stop: (e, ui) => ctrl.updateItemOrder(ui.item.sortable.model)
        };

      }
    };
  }

  class PatientCaseEditDirectiveCtrl extends DdlEditDirectiveCtrl {
    allStudies: Models.Study[];
    groupedItems: { [index: string]: Models.PatientCase[] };

    // @ngInject
    constructor($scope, kinCollection, kinDdl, Restangular) {
      super($scope, kinCollection, kinDdl, Restangular);
      this.groupedItems = {};
    }

    setUnsortedItems(items) {
      if (items) {
        this.unsortedItems = items;
        this.items = this.kinCollection.sortCloneCollection(items);
        this.groupedItems = _(this.items).sortBy("study").groupBy("study").valueOf();
        this.addEmpty();
      }
    }

    setStudies(studies) {
      this.allStudies = studies;
      this.addEmpty();
    }

    // make empty groups for studies which don't have cases
    addEmpty() {
      _(this.allStudies).map("resource_uri")
        .difference(_.keys(this.groupedItems))
        .each((uri: string) => {
          this.groupedItems[uri] = [];
        });
    }

    deleteItem(item) {
      var group = this.groupedItems[item.study];
      var index = _.indexOf(group, item);
      group.splice(index, 1);

      this.items.splice(_.indexOf(this.items, item), 1);
    }

    addItem(study) {
      var group = this.groupedItems[study.resource_uri];
      if (!group) {
        group = this.groupedItems[study.resource_uri] = [];
      }
      var item: Models.PatientCase = <any>{
        name: "",
        order: this.getInitOrder(group),
        study: study.resource_uri,
        default: false
      };
      group.push(item);
      this.items.push(item);
    }

    toggleDefault(item: Models.PatientCase) {
      var def = !item.default;
      _.each(this.items, (x: Models.PatientCase) => {
        if (x.study === item.study) {
          x.default = false;
        }
      });
      item.default = def;
    }

    baseUpdateItemOrder(moved: Models.PatientCase) {
      var items = this.groupedItems[<string>moved.study];
      _.each(items, (item: Models.PatientCase, index) => {
        item.order = index + 1;
      });
    }
  }

  // @ngInject
  function patientCaseEditDirective(kinCollection) {
    return {
      restrict: 'E',
      templateUrl: 'app/admin/ddl-edit/patient-case-edit.html',
      scope: {
        unsortedItems: '=items',
        ctrl: '=?'
      },
      controller: PatientCaseEditDirectiveCtrl,
      controllerAs: 'vm',
      link: function(scope, elem, attrs, ctrl: PatientCaseEditDirectiveCtrl) {
        // expose controller to user of directive
        scope.ctrl = ctrl;

        scope.sortableOptions = {
          axis: "y",
          handle: ".drag-handle",
          stop: (e, ui) => ctrl.updateItemOrder(ui.item.sortable.model)
        };

        scope.$root.$watch("studies", function(studies) {
          ctrl.setStudies(studies);
        });

        scope.$watch("unsortedItems", function(items) {
          ctrl.setUnsortedItems(items);
        });

      }
    };
  }

  // @ngInject
  function editLabelDirective($timeout: ng.ITimeoutService): ng.IDirective {
    return {
      restrict: 'E',
      templateUrl: 'app/admin/ddl-edit/edit-label.html',
      require: '?ngModel',
      scope: {
        cls: '@class',
        editing: '=?',
        onDelete: '&',
        showDelete: '=?',
        item: '=?',
        uniqueField: '@'
      },
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {
        scope.focusAfterDigest = function() {
          $timeout(function() {
            elem.find("input").focus();
          });
        };

        scope.startEdit = function(ev) {
          scope.editing = true;
          scope.focusAfterDigest();
          // fixme: shift cursor to letter which was clicked
        };

        scope.stopEdit = function(ev) {
          scope.editing = false;
        };

        scope.$watch("editing", function(newValue, oldValue) {
          if (newValue === true && oldValue === false) {
            scope.focusAfterDigest();
          }
        });

        scope.$watch("model", function(newValue, oldValue) {
          // initially edit empty item
          // fixme: allow blank, used undefined/null for placeholder
          if (newValue === oldValue && newValue === "") {
            scope.startEdit()
          }

          if (ngModel) {
            ngModel.$setViewValue(newValue);
          }
        });

        scope.keypress = function(ev) {
          if (ev.keyCode === 13) {
            ev.preventDefault();
            ev.stopPropagation();
            scope.stopEdit();
          }
        };

        if (ngModel) {
          ngModel.$render = function() {
            scope.model = ngModel.$viewValue;
          };
        }
      }
    };
  }

  class ContainerClassEditDirectiveCtrl extends DdlEditDirectiveCtrl {
    // @ngInject
    constructor($scope, kinCollection, kinDdl, Restangular) {
      super($scope, kinCollection, kinDdl, Restangular);
    }

    setUnsortedItems(items) {
      function topoSort(items) {
        var sorted = [];
        var uriMap = _.keyBy(items, "resource_uri");
        var seen = {};
        var follow = resource_uri => {
          if (!seen[resource_uri]) {
            seen[resource_uri] = true;
            _.each(items, (item: Models.ContainerClass) => {
              if (item.contained_by === resource_uri) {
                sorted.push(item);
                follow(item.resource_uri);
              }
            });
          }
        };
        follow(null);
        return sorted;
      };

      if (items) {
        var munge = _.flowRight(_.partialRight(_.map, x => x.clone()), topoSort); // ☢
        this.unsortedItems = items;
        this.items = this.kinCollection.mungeCollection(items, munge);
      }
    }

    makeItem() {
      var items = <Models.ContainerClass[]>this.items;
      return this.bless({
        name: "",
        dim: 2,
        def_width: 10,
        def_height: 10,
        def_depth: 1,
        coord: "1A0",
        contained_by: items.length ? _.last(items).resource_uri : null
      });
    }

    beforeSave(items: restangular.ICollection): restangular.ICollection {
      var prev = null;
      _.each(items, item => {
        if (prev) {
          item.contained_by = prev.resource_uri;
        }
        prev = item;
      });
      return items;
    }

    baseUpdateItemOrder(moved) {
      var prev = null;
      _.each(this.items, (item: Models.ContainerClass, index: number) => {
        item.contained_by = prev;
        prev = item.resource_uri;
      });
    }
  }

  function containerclassEditDirective() {
    return {
      restrict: 'E',
      templateUrl: 'app/admin/ddl-edit/containerclass-edit.html',
      scope: {
        unsortedItems: '=items',
        ctrl: '=?'
      },
      controller: ContainerClassEditDirectiveCtrl,
      controllerAs: 'vm',
      link: function(scope, elem, attrs, ctrl: ContainerClassEditDirectiveCtrl) {
        // expose controller to user of directive
        scope.ctrl = ctrl;

        scope.$watch("unsortedItems", items => ctrl.setUnsortedItems(items));

        scope.sortableOptions = {
          axis: "y",
          // handle: "> .list-group",
          stop: (e, ui) => ctrl.updateItemOrder(ui.item.sortable.model)
        };

        scope.dimOptions = [1, 2, 3];
        scope.coordOptions = [{
          name: "Alphabetical",
          letter: "A"
        }, {
          name: "Numeric 1-based",
          letter: "1"
        }, {
          name: "Numeric 0-based",
          letter: "0"
        }];
      }
    };
  }

  class ContainerEditDirectiveCtrl extends DdlEditDirectiveCtrl {
    filter: {
      // mapping ContainerClass URI -> Container URI
      [index: string]: string;
    };
    cs: ContainersService;
    groupedItems: { [index: string]: Models.Container[]; };

    // mapping of Container URI to a path of names
    containerPath: { [index: string]: string; }

    // mapping of container URI to number of child containers
    containerChildCount: { [index: string]: number; }

    // @ngInject
    constructor($scope, kinCollection,
                kinContainers: ContainersService,
                kinDdl, Restangular) {
      super($scope, kinCollection, kinDdl, Restangular);

      $scope.$watch(() => {
        // watch length of items and classes
        var l1 = this.items ? this.items.length : 0;
        var l2 = (this.cs && this.cs.classes) ? this.cs.classes.length : 0;
        return l1 + "|" + l2;
      }, () => this.updateAll());

      this.cs = kinContainers;
      kinContainers.load();
      this.filter = {};
    }

    setUnsortedItems(items) {
      if (items) {
        this.unsortedItems = items;
        this.items = this.kinCollection.sortCloneCollection(items);
        this.updateAll();
      }
    }

    private updateAll() {
      this.updateGroups();
      this.updatePathNames();
      this.updateCounts();
    }

    private updateGroups() {
      this.groupedItems = _(<Models.Container[]>this.items)
        .sortBy("cls")
        .groupBy("cls")
        .mapValues(function(items: Models.Container[]) {
          return _.sortBy(items, "order");
        })
        .valueOf();
      this.addEmpty();
    }

    private updatePathNames() {
      this.containerPath = _.mapValues(this.cs.containerUri, (cnt, uri) => {
        return _.map(this.cs.findContainerTrail(uri), "name").join(" > ");
      });
    }

    private updateCounts() {
      this.containerChildCount = _.reduce(this.cs.containerUri, (res, cnt, uri) => {
        res[<string>cnt.container]++;
        return res;
      }, _.mapValues(this.cs.containerUri, () => 0));
    }

    // make empty groups for studies which don't have cases
    addEmpty() {
      _(this.cs.classes).map("resource_uri")
        .difference(_.keys(this.groupedItems))
        .each((uri: string) => {
          this.groupedItems[uri] = [];
        });
    }

    private getGroup(cls) {
      if (!this.groupedItems[cls.resource_uri]) {
        this.groupedItems[cls.resource_uri] = [];
      }
      return this.groupedItems[cls.resource_uri];
    }

    makeItem(cls) {
      var items = this.getGroup(cls);
      return this.bless({
        cls: cls.resource_uri,
        name: "",
        width: cls.def_width,
        height: cls.def_height,
        depth: cls.def_depth,
        container: this.filter[cls.contained_by],
        order: this.getInitOrder(items)
      });
    };

    toggleFilter(cls: Models.ContainerClass, item: Models.Container) {
      var resourceUri = <string>cls.resource_uri;
      if (this.filter[resourceUri] === item.resource_uri) {
        this.filter[resourceUri] = null;
      } else {
        this.filter[resourceUri] = item.resource_uri;
      }

      _(this.filter).keys()
        .difference(this.cs.findContainerClassUriTrail(cls))
        .each(resourceUri => {
          delete this.filter[resourceUri];
        }).valueOf();
    }

    isClassShown(cls: Models.ContainerClass): boolean {
      return !cls.contained_by || !!this.filter[<string>cls.contained_by];
    }

    isContainerShown(item: Models.Container): boolean {
      var itemCls = this.cs.classUri[<string>item.cls];
      var containingClsUri = <string>itemCls.contained_by;
      return !this.filter[containingClsUri] ||
        this.filter[containingClsUri] === item.container ||
        !item.container;
    }

    isContainerEmpty(cls: Models.ContainerClass) {
      var group = this.groupedItems[cls.resource_uri];
      return !_.some(group, c => this.isContainerShown(c));
    }

    finishEdit(item, updated) {
      super.finishEdit(item, updated);
      this.updateAll();
    }

    afterSave(items: restangular.ICollection): restangular.ICollection {
      this.cs.refresh();
      return super.afterSave(items);
    }

    baseUpdateItemOrder(item: Models.Container) {
      var items = this.groupedItems[<string>item.cls];
      _.each(items, (item, index: number) => {
        item.order = index + 1;
      });
    }
  }

  // @ngInject
  function containerEditDirective(kinCollection: CollectionService, kinContainers: ContainersService) {
    return {
      restrict: 'E',
      templateUrl: 'app/admin/ddl-edit/container-edit.html',
      scope: {
        unsortedItems: '=items',
        ctrl: '=?'
      },
      controller: ContainerEditDirectiveCtrl,
      controllerAs: 'vm',
      link: function(scope, elem, attrs, ctrl: ContainerEditDirectiveCtrl) {
        // expose controller to user of directive
        scope.ctrl = ctrl;

        scope.$watch("unsortedItems", items => {
          ctrl.setUnsortedItems(items);
        });

        scope.sortableOptions = {
          axis: "y",
          //handle: "> span > .drag-handle",
          items: "li:not(.not-sortable)",
          stop: (e, ui) => ctrl.updateItemOrder(ui.item.sortable.model)
        };
      }
    };
  }

  angular.module('kindred.admin.ddledit', ['ui.sortable'])
    .controller('DdlEditDirectiveCtrl', DdlEditDirectiveCtrl)
    .directive('kinDdlEdit', ddlEditDirective)
    .directive('kinStudyEdit', studyEditDirective)
    .directive('kinEventTypeEdit', eventTypeEditDirective)
    .directive('kinPatientCaseEdit', patientCaseEditDirective)
    .directive('kinEditLabel', editLabelDirective)
    .directive('kinContainerclassEdit', containerclassEditDirective)
    .directive('kinContainerEdit', containerEditDirective);
}
