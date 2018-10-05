module kindred {
  'use strict';

  interface Coord {
    x: number;
    y: number;
    z: number;
  }

  let containerGridComponent: ng.IComponentOptions = {
    templateUrl: "app/sample/container-grid.html",
    bindings: {
      samples: '=?',
      dim: '<',
      coord: '<',
      width: '<',
      height: '<',
      depth: '<',
      highlight: '<', // co-ordinate to highlight
      numPicks: '<',
      nextPickIndex: '=',
      initPicks: '&',
      onSelect: '&',
      onPick: '&'
    },
    require: {
      ngModel: '?ng-model'
    },
    controllerAs: "vm",
    controller: class {
      // directive scope
      samples: Models.ContainerSample[];
      dim: number;
      coord: Coord;
      width: number;
      height: number;
      depth: number;
      highlight: Coord;
      selected: Coord;
      numPicks: number;
      nextPickIndex: number;
      initPicks: () => Coord[];
      onSelect: (scope: { $coord: Coord; $sampleId: number; }) => boolean;
      onPick: (scope: { $coord: Coord; $index: number; $picks: Coord[] }) => boolean;
      ngModel: ng.INgModelController;

      // model vars
      editable: boolean;
      picks: Coord[];

      // helper vars
      grid: number[][][];
      pickNum: number[][][];
      rows: number[];
      cols: number[];
      slices: number[];
      firstHlUsed: boolean;
      hl: Coord;
      hl2: Coord;

      // @ngInject
      constructor(private $scope: ng.IScope, private $element: ng.IAugmentedJQuery) {
        this.rows = [];
        this.cols = [];
        this.slices = [];

        $scope.$watch("vm.width", (width: number) => {
          this.cols = _.range(width);
          this.updateGrid();
        });
        $scope.$watch("vm.height", (height: number) => {
          this.rows = _.range(height);
          this.updateGrid();
        });
        $scope.$watch("vm.depth", (depth: number) => {
          this.slices = _.range(depth);
          this.updateGrid();
        });
        $scope.$watch("vm.dim", () => this.updateGrid());

        $scope.$watch("vm.samples", () => this.updateGrid());

        if (_.isUndefined(this.numPicks)) {
          this.numPicks = 0;
        }
      }

      $onInit() {
        if (this.ngModel) {
          this.ngModel.$render = () => this.setPicks(this.ngModel.$modelValue);
        }

        this.picks = this.initPicks() || [];
        this.updatePickNum();
        this.updateGrid();
      }

      picksChanged(val) {
        if (this.ngModel) {
          this.ngModel.$setViewValue(val);
        }
      }

      select(x, y, z) {
        var selected = {x: x, y: y, z: z};
        var res = this.onSelect({
          $coord: selected,
          $sampleId: this.gridLookup(x, y, z)
        });
        if (res !== false) {
          this.selected = selected;

          if (_.isNumber(this.numPicks) && this.numPicks > 0) {
            var index = this.pickLookup(x, y, z);
            if (index === null) {
              index = _.isNumber(this.nextPickIndex) ?
                this.nextPickIndex :
                Math.min(this.picks.length, this.numPicks - 1);
              this.tryMovePick(index, x, y);
            } else {
              this.nextPickIndex = index;
            }
          }
        }
      }

      private tryMovePick(index: number, x: number, y: number) {
        if (!this.isFull(x, y) && !this.isPicked(x, y)) {
          var coord = this.movePick(index, x, y);

          this.onPick({
            $coord: coord,
            $index: index,
            $picks: this.picks
          });
        }
      }

      private movePick(index: number, x: number, y?: number, z?: number) {
        var coord = { x: x, y: y, z: z };
        if (this.pickNum) {
          var old = this.picks[index];
          if (old) {
            this.setGridEntry(this.pickNum, old.x, old.y, 0, null);
          }
          this.picks[index] = coord;
          this.setGridEntry(this.pickNum, x, y, 0, index);
        } else {
          this.picks[index] = coord;
          this.updatePickNum();
        }
        return coord;
      }

      private dndIndex: number;
      onGridDnd(x: number, y: number, ev: boolean) {
        if (ev === false) {
          // mouse up
          this.dndIndex = null;
        } else if (ev === true) {
          // mouse down
          this.dndIndex = this.pickLookup(x, y);
          return this.dndIndex !== null;
        } else {
          // mouse move
          if (this.dndIndex !== null) {
            this.tryMovePick(this.dndIndex, x, y);
          }
        }
      }

      private makeGrid() {
        if (this.dim) {
          return _.times(this.dim >= 3 ? Math.max(this.depth, 1) : 1, () => {
            return _.times(this.dim >= 2 ? Math.max(this.height, 1) : 1, () => {
              return _.times(Math.max(this.width, 1), _.constant(null));
            });
          });
        }
      }

      private setGridEntry(grid: any[][][], x: number, y: number, z: number, val: any) {
        var slice = grid[z || 0];
        var row = slice ? slice[y || 0] : null;
        if (row) {
          row[x || 0] = val;
        }
      }

      private updateGrid() {
        this.grid = this.makeGrid();
        if (this.grid) {
          _.each(this.samples, location => {
            if (!this.isPicked(location.x, location.y, location.z)) {
              this.setGridEntry(this.grid, location.x, location.y, location.z, location.sample);
            }
          });
        }
      }

      private updatePickNum() {
        this.pickNum = this.makeGrid();
        if (this.pickNum) {
          _.each(this.picks, (pick, i) => {
            if (pick) {
              this.setGridEntry(this.pickNum, pick.x, pick.y, pick.z, i);
            }
          });
        }
      }

      setPicks(picks: Coord|Coord[]) {
        if (picks instanceof Array) {
          this.picks = picks;
        } else if (this.numPicks === 1) {
          this.picks = [<Coord>picks];
        }
      }

      private baseGridLookup(grid, x, y, z) {
        return grid ? grid[z || 0][y || 0][x || 0] : null;
      }

      private gridLookup(x: number, y?: number, z?: number) {
        return this.baseGridLookup(this.grid, x, y, z);
      }

      private pickLookup(x: number, y?: number, z?: number) {
        return this.baseGridLookup(this.pickNum, x, y, z);
      }

      private isFull(x: number, y?: number, z?: number): boolean {
        return this.gridLookup(x, y, z) !== null;
      }

      private isPicked(x: number, y?: number, z?: number): boolean {
        return this.pickLookup(x, y, z) !== null;
      }

      private isSelected(x: number, y: number): boolean {
        return this.selected &&
          y === this.selected.y &&
          x === this.selected.x;
      }

      /** pickIndex + 1 ... for use in the template */
      getPickNum(x, y, z) {
        var index = this.pickLookup(x, y, z);
        return index === null ? null : index + 1;
      }

      rowClass(y: number) {
        return {
          highlight: this.highlight && y === this.highlight.y,
          sel: this.selected && y === this.selected.y
        };
      }

      cellClass(x: number, y: number) {
        return {
          full: this.isFull(x, y),
          empty: !this.isFull(x, y),
          highlight: this.highlight && x === this.highlight.x,
          selected: this.isSelected(x, y),
          picked: this.isPicked(x, y),
          sel: this.selected && x === this.selected.x
        };
      }

      private printGrid(grid: number[][][]) {
        var p = _.map(grid[0], row => _.map(row, pick => {
          return _.isNumber(pick) ? "" + pick : '.';
        }).join("")).join("\n");
        console.log(p);
      }
    }
  };

  interface SquareDndScope extends ng.IScope {
    callback: (scope: { ev: boolean, x: number, y: number }) => boolean;
    width: number;
    height: number;
  }

  // @ngInject
  function squareDndDirective(): ng.IDirective {
    return {
      restrict: 'A',
      scope: {
        callback: '&kinSquareDnd',
        width: '<squareWidth',
        height: '<squareHeight'
      },
      link: function(scope: SquareDndScope, elem, attrs) {
        // jQuery fun time
        var getCoord = ev => {
          var pos = elem.offset();
          var p = {
            x: Math.max(0.0, Math.min(1.0, (ev.pageX - pos.left) / elem.width())),
            y: Math.max(0.0, Math.min(1.0, (ev.pageY - pos.top) / elem.height()))
          };
          if (_.isNumber(scope.width)) {
            p.x = Math.min(scope.width - 1, Math.floor(p.x * scope.width));
          }
          if (_.isNumber(scope.height)) {
            p.y = Math.min(scope.height - 1, Math.floor(p.y * scope.height));
          }
          return p;
        };
        var getParams = (ev, what) => {
          var coord = getCoord(ev);
          return {
            x: coord.x,
            y: coord.y,
            ev: what
          };
        };
        var lastParams = null;
        var callback = (ev, what) => {
          var params = getParams(ev, what);
          if (!angular.equals(params, lastParams)) {
            lastParams = params;
            return scope.callback(params);
          }
        };

        var mouseMove = (ev) => {
          if (ev.buttons) {
            callback(ev, null);
          } else {
            elem.off("mousemove", mouseMove);
          }
        };
        var mouseDown = (ev) => {
          var res = callback(ev, true);
          if (res !== false) {
            elem
              .off("mousemove", mouseMove)
              .on("mousemove", mouseMove);
          }
        };
        var mouseUp = (ev) => {
          elem.off("mousemove", mouseMove);
          callback(ev, false);
        };

        elem
          .on("mousedown", mouseDown)
          .on("mouseup", mouseUp)
          .on("$destroy", () => {
            elem.off("mousedown", mouseDown).off("mouseup", mouseUp);
          });
      }
    }
  };

  // @ngInject
  function sampleLocationDirective(kinContainers: ContainersService, $rootRouter) {
    return {
      restrict: 'E',
      scope: {
        location: '='
      },
      templateUrl: "app/sample/sample-location.html",
      link: function(scope, elem, attrs) {
        var depthSort = function(containers: Models.Container[]) {
          var uriMap = _.keyBy(containers, "resource_uri");
          var parentMap = _.keyBy(containers, "container");
          var sorted = [];
          var cur = null;
          while (sorted.length < containers.length) {
            var next = parentMap[cur];
            sorted.push(next);
            cur = next.resource_uri;
          }
          return sorted;
        };

        kinContainers.load().then(function(cs) {
          scope.classUri = cs.classUri;
        });
        scope.sampleSelect = function(sampleId) {
          if (sampleId) {
            $rootRouter.navigate(["/App/Biobank/Sample/Detail", {id: sampleId}]);
          }
          return false;
        };
        scope.$watch("location.containers.length", function(len) {
          if (len && scope.location && scope.location.containers) {
            scope.location.containers = depthSort(scope.location.containers);
            scope.container = scope.location.containers[len - 1];
          }
        });
      }
    };
  }

  // @ngInject
  function sampleShowFullLocationDirective(Restangular: restangular.IService, kinContainers: ContainersService) {
    return {
      restrict: 'E',
      scope: {
        briefLocation: '=location'
      },
      templateUrl: "app/sample/show-full-location.html",
      link: function(scope, elem, attrs) {
        kinContainers.load().then(function(cs) {
          scope.cs = cs;
          scope.classUri = cs.classUri;
          updateCls();
        });

        scope.$watch("briefLocation", function(briefLocation) {
          if (briefLocation) {
            Restangular.one("samplelocation", briefLocation.id).get().then(function(loc) {
              scope.location = loc;
            });
            updateCls();
          } else {
            scope.location = null;
          }
        });

        var updateCls = function() {
          if (scope.briefLocation && scope.cs) {
            scope.container = kinContainers.containerUri[scope.briefLocation.container];
            scope.containerClass = kinContainers.classUri[scope.container.cls];
            scope.props = kinContainers.containerProps(scope.container);
          }
        };
      }
    };
  }

  // @ngInject
  function sampleIdPopoverDirective($filter, kinBiobankUrls: BiobankUrlsService): ng.IDirective {
    return {
      restrict: 'A',
      scope: {
        kinSampleIdPopover: '='
      },
      link: function(scope, elem, attrs) {
        var attr = "sample-id";
        var getContent = function() {
          var sample_id = angular.element(this).attr(attr);
          if (sample_id) {
            var fmt = $filter("sampleId")({id: sample_id});
            var svg = kinBiobankUrls.label(sample_id);
            return '<img src="' + svg + '" alt="' + fmt + '">';
          }
        };

        elem.popover({
          content: getContent,
          html: true,
          container: 'body',
          //selector: ".container-grid a.container-grid-cell",
          trigger: "hover"
        });

        scope.$watch("kinSampleIdPopover", (sampleId: string) => {
          elem.attr(attr, sampleId || "");
        });

        elem.on("$destroy", function(event) {
          elem.popover("destroy");
        });
      }
    };
  }

  /*
   * This directive lets the user select a container by showing large
   * boxes for each container. It's currently used in the biobank
   * browse screen.
   */
  // @ngInject
  function locationBrowseDirective(Restangular: restangular.IService, kinContainers: ContainersService) {
    return {
      restrict: 'E',
      scope: {
        levels: '=',
        container: '=',
        capacity: '=?',
        showMatches: '=?',
        onSelect: '&'
      },
      transclude: true,
      templateUrl: "app/sample/location-browse.html",
      controller: function($scope) {
        var children = [];
        this.addBadge = function(scope) {
          children.push(scope);
        };
        this.setContainer = function(container) {
          $scope.container = container;
          _.each(children, function(scope) {
            scope.container = container;
          });
        };
      },
      link: function(scope, elem, attrs, ctrl) {
        kinContainers.load().then(function(cs) {
          scope.levels = [{
            cls: cs.rootCls,
            containers: cs.tree
          }];
          scope.containers = cs.containers;
          scope.classes = cs.classes;
        });

        scope.openLevel = function(index, cnt) {
          var cur = scope.levels[index];
          var cls = kinContainers.getClass(cnt);
          var level = !kinContainers.containerProps(cnt).terminal ? {
            terminal: false,
            cls: cls,
            containers: cnt.children
          } : {
            terminal: true,
            cls: cur.cls,
            container: cnt
          };
          scope.levels.splice(index + 1, scope.levels.length, level);
          cur.selected = cnt;
          ctrl.setContainer(cnt);

          if (level.terminal) {
            // load up the samples associated with the container
            Restangular.one("container", cnt.id).get().then(function(cnt) {
              ctrl.setContainer(cnt);
            });
          }
        };

        scope.$watch("showMatches", function(samples) {
          var counts = samples && samples.metadata ?
              samples.metadata.container_counts : {};
          _.each(scope.containers, function(container) {
            container.num_samples_match = counts[container.id];
          });
        });
      }
    };
  }

  /*
   * This directive allows selecting a container using drop-down
   * menus. The options expand rightwards, forming the container
   * path. It is fairly space efficient vertically, so is used on the
   * biobank sample search screen.
   */
  class ContainerPathDirectiveCtrl {
    containers: Models.Container[];
    children: any[];
    levels: {
      cls: Models.ContainerClass,
      containers: Forest<Models.Container>
      terminal: boolean,
      selected: Tree<Models.Container>;
    }[];
    cs: ContainersService;
    container: Models.Container;

    // @ngInject
    constructor(kinContainers: ContainersService) {
      this.children = [];

      kinContainers.load().then(cs => {
        this.cs = cs;
        this.levels = [{
          cls: cs.rootCls,
          containers: cs.tree,
          terminal: false,
          selected: null
        }];
      });
    }

    setContainer(container) {
      this.container = container;
      _.each(this.children, scope => {
        scope.container = container;
      });
    }

    openLevel(index: number, cnt: Tree<Models.Container>) {
      var cur = this.levels[index];
      var cls = this.cs.getClass(cnt);
      cur.selected = cnt;
      if (cls) {
        if (!cur.terminal) {
          var level = {
            terminal: cls["children"].length === 0,
            cls: cls,
            selected: null,
            containers: cnt.children,
          };
          this.levels.splice(index + 1, this.levels.length, level);
        }
      } else {
        console.warn("Check the ContainerClass structure");
      }
      this.setContainer(cnt);
    }
  }

  // @ngInject
  function containerPathDirective(): ng.IDirective {
    return {
      restrict: 'E',
      scope: {
        levels: '=',
        container: '=',
        capacity: '=?',
        showMatches: '=?'
      },
      bindToController: true,
      controller: ContainerPathDirectiveCtrl,
      controllerAs: "vm",
      templateUrl: "app/sample/container-path.html",
      link: function(scope, elem, attrs, ctrl: ContainerPathDirectiveCtrl) {
        scope.$watch("vm.showMatches", (samples: any) => {
          var counts = samples && samples.metadata ?
            samples.metadata.container_counts : {};
          _.each(ctrl.containers, container => {
            container["num_samples_match"] = counts[container.id];
          });
        });
      }
    };
  }

  interface PickLocation {
    container: Models.Container;
    x?: number; y?: number; z?: number;
  }

  /*
   * This component allows selecting a biobank location in a fairly
   * compact way. The options expand downwards as form groups. This is
   * used in the sample edit form.
   */
  let sampleLocationFormGroupsComponent: ng.IComponentOptions = {
    templateUrl: "app/sample/location-form-groups.html",
    require: {
      ngModel: "?ngModel"
    },
    bindings: {
      numPicks: "<",
      onPick: "&",
      ngRequired: "<"
    },
    controllerAs: "vm",
    controller: class {
      // bindings
      numPicks: number;
      onPick: (scope: {$coord: PickLocation, $index: number, $picks: PickLocation[]}) => boolean;
      ngModel: ng.INgModelController;

      // instance vars
      cs: ContainersService;
      levels: any[];
      containers: Models.Container[];
      classes: Models.ContainerClass[];
      location: PickLocation;
      initialLocation: PickLocation;
      picks: PickLocation[];

      // @ngInject
      constructor(private kinContainers: ContainersService,
                  private kinUserPrefs: UserPrefsService,
                  private $q: ng.IQService) {
        this.cs = kinContainers;
        this.levels = null;
        this.picks = [];
      }

      $onInit() {
        this.$q.all([
          this.kinContainers.load(),
          this.kinUserPrefs.getKey("mruContainer")
        ]).then(([cs, cnt]: [ContainersService, string]) => {
          this.containers = cs.containers;
          this.classes = cs.classes;
          this.updateLevels();

          if (this.ngModel) {
            this.ngModel.$render();
          }

          // fill in with mru container if necessary
          var container = !(this.location && this.location.container) && cnt
            ? cs.containerUri[cnt] : null;
          this.setLocation({ container: container });
        });

        if (this.ngModel) {
          this.ngModel.$render = () => {
            var val = angular.copy(this.ngModel.$viewValue || {});

            // resolve container_uri into container
            if (val.container && !val.container.resource_uri) {
              this.kinContainers.load().then(() => {
                val.container = this.kinContainers.containerUri[val.container];
                this.setLocation(val);
              });
            }

            // set first pick from model values
            if (val.container && this.picks.length === 0) {
              this.picks[0] = val;
            }
          };

          this.ngModel.$isEmpty = value => {
            return !value || !value.container;
          };

          this.ngModel.$asyncValidators["goodContainer"] = (modelValue, viewValue) => {
            var loc = modelValue || viewValue;
            if (loc) {
              return this.kinContainers.load().then(cs => {
                var good = !!loc.container;
                if (loc.container) {
                  var props = cs.containerProps(loc.container);
                  good = props.holdsSamples &&
                    (!props.needsCoord || _.isNumber(loc.x));
                }
                return good || this.$q.reject("nope");
              });
            }
            return this.$q.resolve(true);
          };
        }
      }

      gridOnPick(coord: Coord, index: number, picks: Coord[]) {
        this.picks[index] =
          <any>_.assign({ container: this.location.container }, coord);
        if (this.ngModel && index === 0) {
          var val = this.location && this.location.container ? this.location : null;
          if (val) {
            _.assign(this.location, coord);
          }
          this.ngModel.$setViewValue(val);
        }

        this.onPick({ $coord: this.picks[index], $index: index, $picks: this.picks });

        this.levels = this.updateLevels();
      }

      gridInitPicks() {
        return _.map(this.picks, pick => {
          return pick.container === this.location.container ?
            _.pick(pick, "x", "y", "z") : undefined;
        });
      }

      private setLocation(location) {
        this.location = location;
        if (!this.initialLocation) {
          this.initialLocation = angular.copy(location);
        }
        this.levels = this.updateLevels();
      }

      private updateLevels() {
        if (this.location && this.kinContainers.containers) {
          return this.updateLevels2(this.location, this.kinContainers);
        } else {
          return null;
        }
      }

      private updateLevels2(location: PickLocation, cs: ContainersService) {
        var trail = location.container ? cs.findContainerTrail(location.container.resource_uri) : [];

        var levels = _.map(trail, (cnt: Models.Container) => {
          var cls = cs.classUri[<string>cnt.cls];
          var props = cs.containerProps(cnt);
          return {
            container: cnt,
            cls: cls,
            containers: cnt["children"],
            terminal: props.terminal,
            samples: null
          };
        });

        if (levels.length) {
          var lastLevel = levels[levels.length - 1];
          _.each(lastLevel.cls["children"], cls => {
            lastLevel = {
              container: null,
              cls: cls,
              containers: location.container["children"], // fixme
              terminal: false,
              samples: null
            };
            levels.push(lastLevel);
          });

          if (lastLevel.terminal) {
            // load up the samples associated with the container
            this.kinContainers.fetchSamples(lastLevel.container).then(samples => {
              lastLevel.samples = samples;
            })
          }
        } else {
          levels = [{
            container: null,
            cls: cs.rootCls,
            containers: cs.tree,
            terminal: false,
            samples: null
          }];
        }

        return levels;
      }

      openLevel(index: number, cnt: Models.Container) {
        this.setLocation({
          container: cnt
        });
      }

      closeLevel(index: number, cnt: Models.Container) {
        var uri = <string>cnt.container;
        this.setLocation({
          container: uri ? this.kinContainers.containerUri[uri] : null
        });
      }

      gridSelect(coord: Coord, sampleId: number) {
        if (coord && !sampleId) {
          this.setLocation(<any>_.assign({}, this.location, coord));
        } else {
          // disallow selection of this square
          return false;
        }
      }
    }
  };

  // fixme: no workies $@#!
  // @ngInject
  function containerBadgeDirective() {
    return {
      restrict: 'E',
      require: '^kinLocationBrowse',
      transclude: true,
      template: '<span class="badge" ng-transclude></span>',
      link: function(scope, elem, attrs, ctrl) {
        ctrl.addBadge(scope);
      }
    };
  }

  // @ngInject
  function patientSamplesTableDirective(Restangular: restangular.IService, kinDdl: DdlService, kinUserPerms: UserPermsService, kinExpandState: ExpandStateService): ng.IDirective {
    return {
      restrict: 'E',
      scope: {
        patient: '=',
        patientEvents: '=events',
        study: '=',
        limitStudy: '='
      },
      templateUrl: "app/sample/patient-samples-table.html",
      link: function(scope: any, elem, attrs) {
        scope.perms = kinUserPerms;
        scope.kinExpandState = kinExpandState;
        scope.samples = null;

        var updateEvents = function() {
          if (scope.patientEvents && scope.samples) {
            scope.groups = _.map(scope.patientEvents, (event: Models.Event) => {
              return {
                event: event,
                samples: _.filter(scope.samples, (sample: Models.Sample) => {
                  return _.some(sample.transactions, (xact: Models.Transaction) => {
                    return xact.samplecollection && xact.samplecollection.event === event.resource_uri;
                  });
                })
              };
            });
          }
        };

        var updateSamples = function() {
          if (scope.patient && scope.patient.id) {
            var studyId = scope.study && scope.limitStudy
              ? scope.study.id : undefined;
            loadSamples(scope.patient.id, studyId);
          }
        };

        var loadSamples = function(patient_id, study_id) {
          var q = {
            transactions__samplecollection__event__person: patient_id,
            transactions__samplecollection__event__study: study_id,
            limit: 0
          };
          Restangular.all("sample").getList(q).then(function(samples) {
            _.each(samples, function(sample) {
              if (sample.cls.resource_uri) {
                sample.cls = sample.cls.resource_uri;
              }
            });
            scope.samples = _.sortBy(samples, "id");
            updateEvents();
          });
        };

        scope.getCollectionDate = function(sample) {
          var collection = <Models.Transaction[]>_.filter(sample.transactions, "samplecollection");
          return collection.length ? collection[0].date : null;
        };

        kinDdl.get("sampleclass").then(function(classes) {
          scope.classes = _.keyBy(classes, "resource_uri");
        });

        scope.afterAddTransaction = function(xact) {
          updateSamples();
        };

        scope.$watchGroup(["patient.id", "study.id", "limitStudy"], updateSamples);
        scope.$watch("patientEvents.length", updateEvents);
      }
    };
  }

  function eventSamplesTableDirective(): ng.IDirective {
    return {
      restrict: 'E',
      replace: true, // required for .panel > table css rules
      scope: {},
      bindToController: {
        event: '<',
        currentSample: '<sample',
        isLoading: '='
      },
      templateUrl: "app/sample/event-samples-table.html",
      controllerAs: "vm",
      controller: class {
        /** event embedded in sample resource */
        event: Models.Event;
        currentSample: Models.Sample;
        /** indicates loading status */
        isLoading: boolean;

        /** sample list */
        samples: Models.Sample[];
        /** sampleclass resource_uri lookup */
        classes: { [index: string]: Models.SampleClass; };

        // @ngInject
        constructor($scope: ng.IScope, Restangular: restangular.IService, kinDdl: DdlService, public $rootRouter) {
          kinDdl.get("sampleclass").then(cls => {
            this.classes = <any>_.keyBy(cls, "resource_uri");
          });

          $scope.$watch(() => this.event, event => {
            if (event) {
              var q = {
                transactions__samplecollection__event: event.id,
                limit: 0
              };
              this.isLoading = true;
              Restangular.all("sample").getList(q).then(samples => {
                this.samples = _.each(samples, sample => {
                  sample.link = ['/App/Biobank/Sample/Detail', { id: sample.id }];
                });
                this.isLoading = false;
              });
            }
          });
        }
      },
      link: function(scope, elem, attrs) {
      }
    };
  }

  class SampleTransactionsTableCtrl {
    sample: Models.Sample;
    cs: ContainersService;
    afterEdit: (scope: { $xact: any; }) => void;

    // @ngInject
    constructor(kinContainers: ContainersService,
                private kinTransactionModal: TransactionModalService) {
      this.cs = kinContainers;
      kinContainers.load();
    }

    editTransaction(xact: Models.Transaction) {
      this.kinTransactionModal.edit(this.sample, xact)
        .then(updated => {
          this.afterEdit({ $xact: updated });
        });
    }
  }

  // @ngInject
  function sampleTransactionsTableDirective() {
    return {
      restrict: 'E',
      scope: {
        sample: '=',
        afterEdit: '&'
      },
      bindToController: true,
      controller: SampleTransactionsTableCtrl,
      controllerAs: 'vm',
      templateUrl: "app/sample/transactions-table.html",
      link: function(scope, elem, attrs, ctrl: SampleTransactionsTableCtrl) {
      }
    };
  }


  // @ngInject
  function xactSampleLinkDirective(Restangular: restangular.IService, crud: CrudService) {
    return {
      restrict: 'E',
      scope: {
        // transaction resource uri
        uri: '<'
      },
      template: '<a ng-if="sample" ng-link="[\'Detail\', {id: sample.id}]" class="kin-record-id">{{ sample|sampleId }}</a>',
      link: function(scope, elem, attrs) {
        scope.$watch("uri", uri => {
          if (uri) {
            var query = {
              transactions: crud.parseResourceUri(uri)
            };
            Restangular.all("sample").getList(query).then(samples => {
              scope.sample = samples[0];
            });
          }
        });
      }
    };
  }

  // @ngInject
  function sampleSubdivisionLinksDirective(Restangular: restangular.IService, crud: CrudService) {
    return {
      restrict: 'E',
      scope: {
        origin: '='
      },
      template: '<ul class="transaction-sample-links"><li ng-repeat="sample in samples"><a ng-link="[\'Detail\', {id: sample.id}]" class="kin-record-id">{{ sample|sampleId }}</a></li></ul>',
      link: function(scope, elem, attrs) {
        scope.$watch("origin", function(origin) {
          if (origin && origin.id) {
            var query = { transactions__samplesubdivision__origin: origin.id };
            Restangular.all("sample").getList(query).then(function(samples) {
              scope.samples = samples;
            });
          }
        });
      }
    };
  }

  // @ngInject
  function sampleSubcultureLinksDirective(Restangular: restangular.IService, crud: CrudService) {
    return {
      restrict: 'E',
      scope: {
        origin: '='
      },
      template: '<ul class="transaction-sample-links"><li ng-repeat="sample in samples"><a ng-link="[\'Detail\', {id: sample.id}]" class="kin-record-id">{{ sample|sampleId }}</a></li></ul>',
      link: function(scope, elem, attrs) {
        scope.$watch("origin", function(origin) {
          if (origin && origin.id) {
            var query = { transactions__samplesubculturedfrom__origin: origin.id };
            Restangular.all("sample").getList(query).then(function(samples) {
              scope.samples = samples;
            });
          }
        });
      }
    };
  }

  interface SampleAction {
    title: string;
    type: string;
    tooltip: string;
    disabled: boolean;
  }

  class AddTransactionButtonsCtrl {
    // directive scope bindings
    sample: Models.Sample;
    buttonClass: string
    afterAdd: (scope: { $xact: any; }) => void;

    // view variables
    tooltip: string;
    actions: SampleAction[];

    // @ngInject
    constructor($scope: ng.IScope, private kinTransactionModal: TransactionModalService) {
      $scope.$watch("sample", () => this.updateActions());
      this.updateActions();
    }

    addTransaction(sample: Models.Sample, action: SampleAction) {
      if (!action.disabled) {
        this.kinTransactionModal.add(sample, action.type)
          .then(xact => {
            sample.transactions.push(xact);
            this.afterAdd({ $xact: xact });
          });
      }
    }

    private updateActions() {
      this.actions = this.createActions(this.sample);
    }

    private createActions(sample: Models.Sample) {
      var sampleGone = sample.amount <= 0.0;
      var sampleAllocated = sample.location != null;

      return [{
        title: "Use",
        type: "U",
        tooltip: "Record use of the entire/a portion of the sample",
        disabled: sampleGone
      }, {
        title: "Destroy",
        type: "D",
        tooltip: "Record destruction of sample",
        disabled: sampleGone
      }, {
        title: "Subdivide",
        type: "A",
        tooltip: "Split the sample into aliquot parts",
        disabled: sampleGone
      }, {
        title: "Subculture",
        type: "J",
        tooltip: "Use some of/the entire sample to grow subcultures",
        disabled: sampleGone
      }, {
        title: sampleAllocated ? "Move": "Allocate",
        type: "M",
        tooltip: sampleAllocated ?
          "Change location of sample" :
          "Set location of sample",
        disabled: sampleGone
      }, {
        title: "Send",
        type: "X",
        tooltip: "Send sample to a collaborator",
        disabled: sampleGone
      }, {
        title: "Adjust",
        type: "L",
        tooltip: "Adjust sample amount",
        disabled: sampleGone
      }, {
        title: "Note",
        type: "",
        tooltip: "Attach a note to the sample",
        disabled: false
      }];
    }
  }

  // @ngInject
  function addTransactionButtonsDirective() {
    return {
      restrict: 'E',
      scope: {
        sample: '=',
        buttonClass: '@',
        afterAdd: '&'
      },
      bindToController: true,
      controller: AddTransactionButtonsCtrl,
      controllerAs: 'vm',
      templateUrl: "app/sample/add-transaction-buttons.html",
      link: function(scope, elem, attrs) {
      }
    };
  }

  class ShowLocationController {
    popover: string;
    location: Models.SampleLocation;
    cs: ContainersService;

    // @ngInject
    constructor(private Restangular: restangular.IService, kinContainers: ContainersService) {
      this.cs = kinContainers;
    }

    updateSampleLocation(loc) {
      this.popover = "";
      var setup = (location) => {
        this.location = location;
        if (location) {
          this.popover = _(location.containers).map("name").join("<br>\n");
        }
      };

      if (loc && loc.id) {
        var containerUri = (loc.container && loc.container.resource_uri)
          ? loc.container.resource_uri : loc.container;
        this.cs.load().then((cs) => {
          var containers = cs.findContainerTrail(containerUri).reverse();
          setup(_.assign({}, loc, {
            container: containers[0],
            containers: containers
          }));
        });
      } else if (_.isString(loc)) {
        this.Restangular.oneUrl("samplelocation", loc).get().then(setup);
      } else {
        setup(null);
      }
    }
  }

  // @ngInject
  function showLocationDirective(): ng.IDirective {
    return {
      restrict: 'A',
      scope: {
        samplelocation: '=kinShowLocation'
      },
      controller: ShowLocationController,
      controllerAs: 'vm',
      templateUrl: "app/sample/show-location.html",
      link: function(scope, elem, attrs, ctrl: ShowLocationController) {
        scope.$watch("samplelocation", loc => ctrl.updateSampleLocation(loc));

        elem.popover({
          content: function() {
            return angular.element(this).attr("data-tooltip");
          },
          selector: "[data-tooltip]",
          container: "body",
          placement: "auto top",
          trigger: "hover"
        });

        elem.on("$destroy", function(event) {
          elem.popover("destroy");
        });
      }
    };
  }

  // @ngInject
  function integerDirective() {
    var INTEGER_REGEXP = /^\-?\d+$/;

    return {
      require: 'ngModel',
      link: function(scope, elm, attrs, ctrl) {
        ctrl.$validators.integer = function(modelValue, viewValue) {
          if (ctrl.$isEmpty(modelValue)) {
            // consider empty models to be valid
            return true;
          }

          if (INTEGER_REGEXP.test(viewValue)) {
            // it is valid
            return true;
          }

          // it is invalid
          return false;
        };
      }
    };
  }

  // @ngInject
  function sampleLabelDirective(kinBiobankUrls: BiobankUrlsService) {
    return {
      restrict: 'A',
      scope: {
        kinSampleLabel: '='
      },
      link: function(scope, elem, attrs) {
        scope.$watch("kinSampleLabel.id", function(sampleId) {
          elem.attr("src", kinBiobankUrls.label(sampleId, { borders: 1 }));
        });
        elem.addClass("kin-sample-label");
      }
    };
  }

  // @ngInject
  function sampleQrCodeDirective(kinBiobankUrls: BiobankUrlsService) {
    return {
      restrict: 'A',
      scope: {
        kinSampleQrcode: '='
      },
      link: function(scope, elem, attrs) {
        scope.$watch("kinSampleQrcode.id", function(sampleId) {
          elem.attr("src", kinBiobankUrls.qrcode(sampleId));
        });
        elem.addClass("kin-sample-qrcode");
      }
    };
  }

  // @ngInject
  function labelPrintButtonDirective($window: ng.IWindowService, $timeout: ng.ITimeoutService, kinLabelPrint: LabelPrintService) {
    return {
      restrict: 'E',
      scope: {
        sample: '='
      },
      templateUrl: "app/sample/label-print-button.html",
      link: function(scope, elem, attrs) {
        scope.ui = {};
        scope.labelPrint = kinLabelPrint;
        scope.$watch("labelPrint.labels.ids.length", function() {
          scope.images = kinLabelPrint.getPreviewUrls(true);
          scope.labelsUrl = kinLabelPrint.getLabelsUrl();
        });

        scope.add = function($event) {
          $event.preventDefault();
          $event.stopPropagation();
          kinLabelPrint.add(scope.sample);
        };

        scope.print = function($event) {
          $event.preventDefault();
          $event.stopPropagation();
          $window.open(kinLabelPrint.getLabelsUrl(), "_blank");
          kinLabelPrint.clear();
        };
        scope.clearAfterPrint = function($event) {
          $timeout(function() {
            kinLabelPrint.clear();
          });
        };
      }
    };
  }

  angular.module("kindred.sample.directives", [])
    .component("kinContainerGrid", containerGridComponent)
    .directive("kinSquareDnd", squareDndDirective)
    .directive("kinSampleLocation", sampleLocationDirective)
    .directive("kinSampleShowFullLocation", sampleShowFullLocationDirective)
    .directive("kinSampleIdPopover", sampleIdPopoverDirective)
    .directive("kinLocationBrowse", locationBrowseDirective)
    .directive("kinContainerPath", containerPathDirective)
    .component("kinSampleLocationFormGroups", sampleLocationFormGroupsComponent)
    .directive("kinContainerBadge", containerBadgeDirective)
    .directive("kinPatientSamplesTable", patientSamplesTableDirective)
    .directive("kinEventSamplesTable", eventSamplesTableDirective)
    .directive("kinSampleTransactionsTable", sampleTransactionsTableDirective)
    .directive("kinXactSampleLink", xactSampleLinkDirective)
    .directive("kinSampleSubdivisionLinks", sampleSubdivisionLinksDirective)
    .directive("kinSampleSubcultureLinks", sampleSubcultureLinksDirective)
    .directive("kinAddTransactionButtons", addTransactionButtonsDirective)
    .directive("kinShowLocation", showLocationDirective)
    .directive("integer", integerDirective)
    .directive("kinSampleLabel", sampleLabelDirective)
    .directive("kinSampleQrcode", sampleQrCodeDirective)
    .directive("kinLabelPrintButton", labelPrintButtonDirective);
}
