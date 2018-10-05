module kindred {
  'use strict';

  interface PageSize {
    value: number;
    name: string;
  }

  interface PagingOptions {
    pageSizes: number[];
    autoPageSize: number;
    maxSize: number;
  }
  class GridPaginationCtrl {
    // directive scope bindings
    pagingOptions: PagingOptions;
    onChanged: (scope: {paging: Paging}) => void;
    paging: Paging;
    totalCount: number;
    queryTime: number;
    searching: boolean;
    error: string;
    selection: any[];
    onPaginationHeight: (scope: { height: number}) => void;

    // controller instance variables
    grid: GridCtrl;
    pageSizes: PageSize[];
    pageSize: number;
    showQueryTime: boolean;

    pageChanged(n) {
      this.notifyChanged();
    }

    private getPageSize() {
      return this.pageSize ? this.pageSize : this.pagingOptions.autoPageSize;
    }

    private notifyChanged() {
      if (this.paging) {
        this.paging.pageSize = this.getPageSize();
      }
      this.onChanged({ paging: this.paging });
    }

    private setMyPageSize() {
      if (this.paging) {
        this.pageSize = (!this.paging.pageSize ||
                         (this.paging.pageSize === this.pagingOptions.autoPageSize))
          ? 0 : this.paging.pageSize;
      }
    }

    // @ngInject
    constructor($scope: ng.IScope, appConfig: AppConfig) {
      this.showQueryTime = !appConfig.production;
      this.pageSize = 0;

      // notify when page size changes somehow
      $scope.$watch(() => this.getPageSize(), () => this.notifyChanged(), true);

      // update select model when api sends back a page size
      $scope.$watch(() => this.paging, () => {
        //this.setMyPageSize();
        this.notifyChanged();
      }, true);

      var updatePageSizes = () => {
        var pageSizes = this.pagingOptions ? this.pagingOptions.pageSizes : [];
        var autoPageSize = this.pagingOptions ? this.pagingOptions.autoPageSize : 0;

        this.pageSizes = _.map(pageSizes, value => {
          return {
            value: value,
            name: "" + value
          };
        });
        this.pageSizes.unshift({
          value: 0,
          name: "Auto" + (autoPageSize ? " (" + autoPageSize + ")" : "")
        });

        this.notifyChanged();
        this.setMyPageSize();
      };
      // Updates list of possible page sizes
      $scope.$watch(() => this.pagingOptions, updatePageSizes, true);
      updatePageSizes();
    }

    pageSizeChanged() {
    }
  }

  // @ngInject
  function gridPaginationDirective(): ng.IDirective {
    return {
      restrict: 'E',
      scope: {},
      bindToController: {
        pagingOptions: '=',
        onChanged: '&',
        paging: '<',
        totalCount: '<',
        queryTime: '<',
        searching: '<',
        error: '<',
        selection: '<',
        onPaginationHeight: '&'
      },
      controller: GridPaginationCtrl,
      controllerAs: 'vm',
      require: ['kinGridPagination', '^kinGrid'],
      transclude: true,
      templateUrl: 'app/components/grid/grid-pagination.html',
      link: function(scope, elem, attrs, [ctrl, kinGridCtrl]: [GridPaginationCtrl, GridCtrl]) {
        ctrl.grid = kinGridCtrl;
        ctrl.onPaginationHeight({
          height: _(elem.children()).map(e => angular.element(e).outerHeight(true)).max()
        });
      }
    };
  }

  let gridSearchComponent: ng.IComponentOptions = {
    require: {
      kinGrid: '^kinGrid'
    },
    bindings: {
      search: '<'
    },
    controllerAs: 'kinGridSearch',
    controller: class {
      search: Searcher;
      kinGrid: GridCtrl;

      // @ngInject
      constructor($scope: ng.IScope) {
        $scope.$watch(() => this.search, search => {
          if (search) {
            this.kinGrid.setSearch(search);
          }
        });
      }
    }
  };

  let gridItemsComponent: ng.IComponentOptions = {
    require: {
      kinGrid: '^kinGrid'
    },
    bindings: {
      items: '<'
    },
    controller: class {
      items: Models.Any[];
      search: Searcher;
      kinGrid: GridCtrl;

      // @ngInject
      constructor($scope: ng.IScope) {
        $scope.$watch(() => this.items, items => {
          if (items) {
            this.search = <any>{
              items: items,
              totalCount: items.length,
              paging: null,
              refresh: () => null
            };
          }
          this.kinGrid.setSearch(this.search);
        });
      }
    }
  };

  export interface ColScope extends ng.IScope {
    // kinGridCol scope attributes
    fields: string;    /** fixme: unused? */
    heading: string;   /** table heading text */
    expr: string;      /** scope expression evalSref for cell value */
    field: string;     /** attr on model object */
    sortField: string; /** which attr is passed to api as sort heading */
    sref: string;      /** cell link expr */
    sortable: boolean; /** is possible to sort this column */
    exportable: boolean; /** is possible to export this column */

    // scope attributes filled in by directives
    type: "col" | "sel" | "data" | "event";
    col: boolean;
    sel: boolean;
    data: boolean;
    event: boolean;

    // data/event col schema info
    prop?: Models.CustomProp;
    loaded?: boolean;

    getLink: (item: any) => any[]; /** evalSref sref cell link expr */
    evalExpr: (item: any) => any[]; /** evaluate cell expr */

    order: number;
    show: boolean;
    xport: boolean;
    sortDir: number;
    selectAll: boolean;
  }

  interface EventTypeCol {
    et: Models.EventType;
    indent: number;
    cols: {
      heading: string;
      field: string;
      prop?: Models.CustomProp;
    }[];
  }

  interface GridScope extends ng.IScope {
  }

  class GridCtrl {
    // directive scope bindings
    paging: any;
    selection: any[];
    onSelect: (scope: { item: any; }) => void;

    // child directives
    cols: ColScope[];
    eventTypeCols: EventTypeCol[];
    rowCtrl: GridRowCtrl;
    search: Searcher;

    // pixel dimensions vars set by nested directives
    paginationHeight: number;
    rowHeight: number;

    /** items coming from the search */
    items: Models.Any[];

    pagingOptions: {
      pageSizes: number[];
      autoPageSize: number;
      maxSize: number;
    };

    minPageSize = 5;

    // @ngInject
    constructor(private $scope: ng.IScope) {
      this.cols = []
      this.selection = this.selection || [];

      $scope.$watchCollection(() => this.selection, () => {
        var all = this.selection.length > 0 && this.selection.length === this.items.length;
        if (all) {
          this.updateSelCols(all);
        } else if (this.selection.length === 0) {
          this.updateSelCols(false);
        }
      });

      this.pagingOptions = {
        pageSizes: [10, 20, 50, 100, 200, 500],
        autoPageSize: 0,
        maxSize: 10 // maximum number of links to put in pagination directive
      };

      $scope.$watch(() => this.search ? this.search.items : null, items => {
        this.items = items;
      });

      // selects all scope variables which require a search refresh if changed
      var needsRefresh = () => {
        return this.search && this.search.paging ? {
          pageSize: this.search.paging.pageSize,
          currentPage: this.search.paging.current,
          autoPageSize: this.pagingOptions.autoPageSize,
          sortFields: this.search.fields ? this.search.fields.sort : [],
          otherFields: null
        } : null;
      };
      $scope.$watch(needsRefresh, () => {
        if (this.search && this.pagingOptions.autoPageSize && this.search.paging.pageSize && this.search.fields) {
          this.search.enable();
          this.search.refresh();
        }
      }, true);
    }

    setAutoPageSize(autoPageSize: number) {
      this.pagingOptions.autoPageSize = autoPageSize;
    }

    pagingChanged(paging: Paging) {
      if (this.search) {
        _.assign(this.search.paging, paging);
      }
    }

    setSearch(search: Searcher) {
      this.search = search;
      if (search) {
        search.disable();
        this.setSearchFields(search.fields);
      }
    }

    addColumn(colScope: ColScope) {
      colScope.type = "col";
      colScope.col = true;
      this.cols.push(colScope);
    }

    addSelColumn(colScope) {
      colScope.type = "sel";
      colScope.sel = true;
      colScope.show = true;
      this.cols.push(colScope);
    }

    /**
     * Removes columns of a certain type from the list.
     */
    private clearColumns(type: string) {
      _.remove(this.cols, col => col.type === type);
    }

    addEventColumns(colScope: EventColsScope) {
      var ctrl = colScope.vm;
      colScope.type = "event";
      colScope.event = true;
      colScope.show = true;

      // clear out existing data columns
      this.clearColumns("event");

      // insert data columns from schema list
      _.each(ctrl.getColumns(), etc => {
        _.each(etc.cols, col => {
          this.cols.push(<any>{
            type: "event",
            event: true,
            eventType: etc.et,
            show: false,
            xport: true,
            sortable: false, // needs support in backend
            exportable: true,
            field: "data." + col.field,
            heading: col.heading,
            prop: col.prop
          });
        });
      });

      // adjust column visibility in light of new fields
      this.fieldsUpdate();
    }

    addDataColumns(colScope: DataColsScope) {
      var ctrl = colScope.vm;
      colScope.type = "data";
      colScope.data = true;
      colScope.show = true;

      // clear out existing data columns
      this.clearColumns("data");

      // insert data columns from schema list
      _.each(ctrl.getColumns(), col => {
        this.cols.push(<any>{
          type: "data",
          data: true,
          show: false,
          xport: true,
          sortable: false, // needs support in backend
          exportable: true,
          field: "data." + col.field,
          heading: col.heading,
          prop: col.prop
        });
      });

      // adjust column visibility in light of new fields
      this.fieldsUpdate();
    }

    setRowCtrl(rowCtrl) {
      this.rowCtrl = rowCtrl;
    }

    getSortField(col) {
      return col.sortField || col.field;
    }

    private fieldsUpdate() {
      if (this.search && this.search.fields) {
        this.setSearchFields(this.search.fields);
      }
    }

    setSearchFields(fields: SearchFields) {
      var updateSortOrder = (ordering, cols: ColScope[]) => {
        var fc = _(cols).filter(this.getSortField).keyBy(this.getSortField).valueOf();
        _.each(ordering, (field: string, index: number) => {
          var desc = field[0] === "-";
          if (desc) {
            field = field.substr(1);
          }
          fc[field].sortDir = (index + 2) * (desc ? -1 : 1);
        });
      };

      if (fields) {
        updateSortOrder(fields.sort, this.cols);
        _.each(this.cols, col => {
          if (fields.show.length) {
            col.show = col.sel || _.includes(fields.show, col.heading);
          }
          if (fields.xport.length) {
            col.xport = _.includes(fields.xport, col.field);
          }
        });
      }
    }

    clearSelection() {
      this.selection.splice(0, this.selection.length);
    };

    selectAll(col, all) {
      this.clearSelection();
      if (all) {
        _.each(this.items, item => {
          this.selection.push(item);
        });
      }
      this.updateSelCols(all);
    };

    private updateSelCols(selectAll) {
      _.each(this.cols, col => {
        if (col.type === "sel") {
          col.selectAll = selectAll;
        }
      });
    }
  }

  // @ngInject
  function gridDirective($window: ng.IWindowService) {
    return {
      restrict: 'E',
      transclude: true,
      scope: {},
      bindToController: {
        selection: '=?',
        onSelect: '&'
      },
      templateUrl: 'app/components/grid/grid.html',
      controller: GridCtrl,
      controllerAs: 'kinGrid',
      link: function(scope: ng.IScope, elem, attrs, ctrl: GridCtrl) {
        var win = angular.element($window);
        var calcAutoPageSize = () => {
          if (ctrl.paginationHeight && ctrl.rowHeight) {
            var table = elem.find("kin-grid-table").children().first();
            var tbody = table.find("tbody").first();
            var windowHeight = win.height();
            if (tbody.length) {
              var tableMargin = table.outerHeight(true) - table.outerHeight();
              var heightAvailable = windowHeight - tbody.offset().top - tableMargin - ctrl.paginationHeight;
              if (heightAvailable > 0) {
                return Math.max(ctrl.minPageSize, Math.floor(heightAvailable / ctrl.rowHeight));
              }
            }
          }
        };

        // Kind of crap watching a dom element's position, but really
        // seems to be necessary.
        // The first table body offset value is wrong because
        // initially the view component is positioned after the
        // previous page's content. Then the previous page is removed
        // and the true offset is known.
        // If there were some way of knowing when the previous page
        // has been removed, then this watch could be replaced.
        scope.$watch(() => {
          var offset = elem.find("kin-grid-table > table:first > tbody:first").offset();
          return offset ? offset.top : null;
        }, offset => {
          if (offset) {
            updateAutoPageSize();
          }
        });

        var updateAutoPageSize = () => {
          var pageSize = calcAutoPageSize();
          if (pageSize) {
            ctrl.setAutoPageSize(pageSize);
          }
        };

        scope["setPaginationHeight"] = function(height) {
          ctrl.paginationHeight = height;
          updateAutoPageSize();
        };

        scope["setRowHeight"] = function(height) {
          ctrl.rowHeight = height;
          updateAutoPageSize();
        };

        var onResize = _.debounce(() => {
          scope.$apply(() => updateAutoPageSize())
        }, 400, {
          leading: true,
          maxWait: 2000,
          trailing: true
        });

        win.on("resize", onResize);
        elem.on("$destroy", () => win.off("resize", onResize));
      }
    };
  }

  class GridTableCtrl {
    // directive scope bindings
    cols: ColScope[];
    items: Models.Any[];
    onSelect: (scope: { item: Models.Any; }) => void;
    pageSize: number;
    fields: SearchFields;
    selection: Models.Any[];
    onRowHeight: (scope: { height: number; }) => void;
    loading: boolean;

    // controller instance variables
    grid: GridCtrl;
    visibleCols: ColScope[];

    empty: string[];
    sel: {
      [index: string]: boolean;
    };

    // @ngInject
    constructor($scope: ng.IScope) {
      this.sel = {};

      var rowCounts = () => {
        return {
          pageSize: this.pageSize || 0,
          numRows: this.items ? this.items.length : 0,
          loading: !this.items
        };
      };
      var updateRowCounts = c => {
        var empty = c.pageSize ? c.pageSize - c.numRows : 0;
        this.empty = _.times(empty, _.constant(""));
        if (c.loading) {
          this.empty[0] = "Loading...";
        }
      };
      $scope.$watch(rowCounts, updateRowCounts, true);

      var colsChanged = () => _.map(this.cols, col => [col.sortDir, col.xport, col.show]);
      $scope.$watch(colsChanged, () => {
        var updateSort = cols => {
          var absSortDir = col => Math.abs(col.sortDir);
          return _(cols)
            .filter(this.grid.getSortField)
            .filter("sortDir")
            .sortBy(absSortDir)
            .map((col: ColScope) => {
              return (col.sortDir < 0 ? "-" : "") + this.grid.getSortField(col);
            })
            .valueOf();
        };
        this.fields = {
          sort: updateSort(this.cols),
          xport: _(this.cols)
            .filter("field")
            .filter("xport")
            .map(col => col.field)
            .valueOf(),
          show: _(this.cols)
            .filter("field")
            .filter("show")
            .map(col => col.heading)
            .valueOf()
        };

        var seen = {};
        this.visibleCols = _.filter(this.cols, col => {
          var visible = col.show && !seen[col.heading];
          if (visible) {
            seen[col.heading] = true;
          }
          return visible;
        });
      }, true);

      $scope.$watch(() => this.fields, () => this.grid.setSearchFields(this.fields), true);

      var itemUri = {};
      $scope.$watch(() => this.items, (items: Models.Any[]) => {
        itemUri = _.keyBy(items, item => item.resource_uri);

        // clears out selection map if items change
        this.sel = <any>_.reduce(items, (sel, item) => {
          sel[item.resource_uri] = !!this.sel[item.resource_uri];
          return sel;
        }, {});
      });

      $scope.$watchCollection(() => this.selection, len => {
        this.sel = <any>_.fromPairs(_.map(this.selection, item => [item.resource_uri, true]));
      });

      $scope.$watch(() => this.sel, sel => {
        this.grid.clearSelection();
        _.each(sel, (yes, resource_uri) => {
          if (yes) {
            this.selection.push(itemUri[resource_uri]);
          }
        });
      }, true);
    }

    sortClicked(col: ColScope, dir?: number) {
      if (col.sortable) {
        if (angular.isUndefined(dir)) {
          // cycle through sort directions
          col.sortDir = col.sortDir ? (col.sortDir > 0 ? -1 : 0) : 1;
        } else if ((col.sortDir > 0 && dir > 0) || (col.sortDir < 0 && dir < 0)) {
          // toggle off sort in given direction
          col.sortDir = 0;
        } else {
          // set sort to given direction
          col.sortDir = dir;
        }
      }
    }

    getRowClass(item: Models.Any) {
      var cls = {
        "grid-row-selected": !!this.sel[item.resource_uri]
      };
      if (this.grid.rowCtrl) {
        _.assign(cls, this.grid.rowCtrl.getRowClass(item));
      }
      return <any>cls;
    }

    rowClicked(ev, item) {
      /* don't perform the row action if the click event has
       * bubbled out of a link within the cell.
       */
      var target = ev.target.nodeName;
      if (target !== "A" && target !== "BUTTON") {
        this.onSelect({ item: item });
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  }

  // @ngInject
  function gridTableDirective(): ng.IDirective {
    return {
      restrict: 'E',
      require: ['kinGridTable', '^kinGrid'],
      transclude: true,
      scope: {},
      bindToController: {
        cols: '<',
        items: '<',
        onSelect: '&',
        pageSize: '=?',
        fields: '=?',
        selection: '=?',
        onRowHeight: '&',
        loading: '<'
      },
      controllerAs: 'vm',
      controller: GridTableCtrl,
      templateUrl: 'app/components/grid/grid-table.html',
      link: function(scope, elem, attrs, [ctrl, kinGridCtrl]: [GridTableCtrl, GridCtrl]) {
        ctrl.grid = kinGridCtrl;
        ctrl.onRowHeight({
          height: elem.find("tr.kin-grid-loading").height()
        });
      }
    };
  }

  // @ngInject
  function gridColDirective($rootScope: ng.IRootScopeService, $parse: ng.IParseService): ng.IDirective {
    return {
      restrict: 'E',
      require: '^kinGrid',
      scope: {
        fields: '@',
        heading: '@',
        expr: '@',
        field: '@',
        sortField: '@',
        sref: '@cellSref',
        sortable: '=?'
      },
      template: '<th>{{ heading }}</th>',
      link: function(scope: ColScope, elem, attrs, kinGridCtrl: GridCtrl) {
        kinGridCtrl.addColumn(scope);

        // sortable defaults to true
        scope.sortable = angular.isDefined(scope.sortable) ? scope.sortable : true;

        var initBool = function(attr, scopeVar) {
          attrs.$observe(attr, function(val) {
            scope[scopeVar] = scope.$eval(attrs[attr]);
          });
        };
        initBool("show", "show");
        initBool("export", "xport");

        // initial sort dir setting
        attrs.$observe("sortDir", function(sortDir) {
          if (angular.isUndefined(scope.sortDir)) {
            scope.sortDir = parseInt(sortDir, 10);
          }
        });

        // set up an exportable property based on field name
        scope.$watch("field", function(field) {
          scope.exportable = field && field[0] !== '_';
        });

        var cellScope = $rootScope.$new(true);
        scope.$watch("sref", (sref: string) => {
          var evalSref = sref ? $parse(sref) : null;
          scope.getLink = item => {
            cellScope["item"] = item;
            return evalSref ? evalSref(cellScope) : null;
          };
        });

        scope.$watch("expr", (expr: string) => {
          var evalExpr = expr ? $parse(expr) : null;
          if (evalExpr) {
            scope.evalExpr = item => {
              cellScope["item"] = item;
              return evalExpr(cellScope);
            };
          } else {
            scope.evalExpr = null;
          }
        });
      }
    };
  }

  interface DataColsScope extends ColScope {
    schema: Models.CustomDataSchema;
    schemaResource: string;
    vm: DataColsCtrl;
  }

  class DataColsCtrl {
    // @ngInject
    constructor(private $scope: DataColsScope,
                private kinSchemaUtil: SchemaUtilService) {
    }

    getColumns() {
      var schema = this.$scope.schema;
      if (schema) {
        return this.kinSchemaUtil.listColumnsFromCDS(schema);
      } else {
        return [];
      }
    }
  }

  // @ngInject
  function gridDataColsDirective(kinCustomDataSchema: CustomDataSchemaService): ng.IDirective {
    return {
      restrict: 'E',
      require: ['kinGridDataCols', '^kinGrid'],
      scope: {
        data: '=',
        schemaResource: '@schema',
        show: '=?'
      },
      controller: DataColsCtrl,
      controllerAs: 'vm',
      template: '',
      link: function(scope: DataColsScope, elem, attrs, [ctrl, kinGridCtrl]: [DataColsCtrl, GridCtrl]) {
        scope.$watch("schemaResource", (resource: string) => {
          kinCustomDataSchema.get(resource).then(schema => {
            scope.schema = schema;
            kinGridCtrl.addDataColumns(scope);
          });
        });
        kinGridCtrl.addDataColumns(scope);
        scope.show = angular.isDefined(scope.show) ? scope.show : false;
      }
    };
  }

  interface EventColsScope extends ColScope {
    //schema: Models.CustomDataSchema;
    eventTypes: Models.EventType[];
    study: Models.Study;
    vm: EventColsCtrl;
  }

  class EventColsCtrl {
    // @ngInject
    constructor(private $scope: EventColsScope,
                private kinEventTypes: EventTypesService,
                private kinSchemaUtil: SchemaUtilService) {
    }

    getColumns(): EventTypeCol[] {
      return _.map(this.$scope.eventTypes, (et: AnnEventType) => {
        return {
          et: et,
          indent: et.depth,
          cols: this.kinSchemaUtil.listColumnsFromSchema(et.fields)
        };
      });
    }
  }

  // @ngInject
  function gridEventColsDirective(kinEventTypes: EventTypesService): ng.IDirective {
    return {
      restrict: 'E',
      require: ['kinGridEventCols', '^kinGrid'],
      scope: {
        data: '=',
        study: '=',
        show: '=?'
      },
      controller: EventColsCtrl,
      controllerAs: 'vm',
      template: '',
      link: function(scope: EventColsScope, elem, attrs, [ctrl, kinGridCtrl]: [EventColsCtrl, GridCtrl]) {
        scope.$watch("study", (study: Models.Study) => {
          kinEventTypes.load(study).then(et => {
            scope.eventTypes = et;
            kinGridCtrl.addEventColumns(scope);
          });
        });
        scope.show = angular.isDefined(scope.show) ? scope.show : false;
      }
    };
  }

  // @ngInject
  function gridSelColDirective(): ng.IDirective {
    return {
      restrict: 'E',
      require: '^kinGrid',
      scope: {
      },
      template: '<th></th>',
      link: function(scope: ColScope, elem, attrs, kinGridCtrl: GridCtrl) {
        scope.show = true;
        kinGridCtrl.addSelColumn(scope);

        scope.$watch("selectAll", function(all) {
          kinGridCtrl.selectAll(scope, all);
        });
      }
    };
  }

  interface GridRowEvalScope extends ng.IScope {
    item: {};
  }

  class GridRowCtrl {
    evalScope: GridRowEvalScope;
    classExpr: {
      (expr: GridRowEvalScope): {};
    };
    expr: string;

    constructor($rootScope: ng.IRootScopeService, private $parse: ng.IParseService) {
      this.evalScope = <GridRowEvalScope>$rootScope.$new(true);
    }

    getRowClass(item) {
      this.evalScope.item = item;
      return this.classExpr(this.evalScope);
    }

    parse() {
      this.classExpr = this.$parse(this.expr);
    }
  }

  // @ngInject
  function gridRowDirective(): ng.IDirective {
    return {
      restrict: 'E',
      require: '^kinGrid',
      scope: {},
      bindToController: {
        expr: '@class'
      },
      controllerAs: 'vm',
      // @ngInject
      controller: GridRowCtrl,
      link: function(scope: any, elem, attrs, kinGridCtrl: GridCtrl) {
        kinGridCtrl.setRowCtrl(scope.vm);
        scope.$watch("vm.expr", () => { scope.vm.parse(); });
      }
    };
  }

  // @ngInject
  function gridCellFilter($rootScope: ng.IRootScopeService, $parse: ng.IParseService, kinDdl: DdlService, kinDateTimeUtil: DateTimeUtilService) {
    // javascript ... a good language for fp???
    var getProp: (get, part: string) => any =
      (get, part) => _.flowRight(get, _.property(part));
    var fieldGetter: (item: any) => any =
      (field: string) => _(field.split("."))
        .reverse()
        .reduce(getProp, _.identity)
        .valueOf();
    var mkGetter = (col: ColScope) => {
      var getField = col.field ? fieldGetter(col.field) : null;
      return col.evalExpr || getField || null;
    };

    return (item: any, col: ColScope, dummyLoaded: boolean) => {
      var fieldGetter = mkGetter(col);
      var val = fieldGetter ? fieldGetter(item) : null;
      return formatCell(val, col, kinDdl, kinDateTimeUtil);
    };
  }

  function formatCell(val: any, col: ColScope, kinDdl: DdlService, kinDateTimeUtil: DateTimeUtilService): string {
    if (_.isUndefined(val) || val === null) {
      return "";
    }

    // custom fields might need some interpretation to display
    if (col && col.prop && (col.type === "data" || col.type === "event")) {
      if (col.prop.type === "resourceId") {
        // fetch drop-down lists to resolve resourceId values
        if (col.loaded === true) {
          var ddl = kinDdl.getListItemNow(col.prop.resource, val);
          return ddl ? ddl.name : "?" + val;
        } else {
          if (col.loaded !== false) {
            col.loaded = false;
            kinDdl.get(col.prop.resource).then(() => {
              col.loaded = true;
            });
          }
          return "...";
        }
      } else if (col.prop.type === "boolean") {
        return val ? "Yes" : "No";
      } else if (col.prop.type === "date") {
        return kinDateTimeUtil.parseApiDateTime(val)
          .format(kinDateTimeUtil.fmt.uiDate);
      } else if (col.prop.type === "datetime") {
        return kinDateTimeUtil.parseApiDateTime(val)
          .format(kinDateTimeUtil.fmt.uiDate + " " +
                  kinDateTimeUtil.fmt.uiTime);
      }
    }

    return val;
  }

  // @ngInject
  function gridEditColsDirective(kinGridColumnsModal: GridColumnsModalService): ng.IDirective {
    return {
      restrict: 'A',
      scope: {
        cols: '=kinGridEditCols'
      },
      link: function(scope, elem, attrs) {
        elem.click(function() {
          scope.$apply(function() {
            kinGridColumnsModal.selectColumnsModal(scope["cols"]);
          });
        });
      }
    };
  }

  interface SortDirScope extends ng.IScope {
    order: number;
    absOrder: number;
    change: { (): void; }
  }

  // @ngInject
  function sortDirDirective(): ng.IDirective {
    return {
      restrict: 'E',
      require: '?ngModel',
      scope: {
      },
      template: '<a href class="kin-sort-dir" ng-class="{ \'kin-sort-dir-none\': !order }" ng-click="change()"><i class="glyphicon" ng-class="{ \'glyphicon-arrow-up\': order < 0, \'glyphicon-arrow-down\': order > 0, \'glyphicon-minus\': !order }"></i><span ng-hide="true || !order">&nbsp;{{ absOrder }}</span></a>',
      link: function(scope: SortDirScope, elem, attrs, ngModel: ng.INgModelController) {
        if (ngModel) {
          ngModel.$render = function() {
            scope.order = ngModel.$viewValue;
          };
        }

        scope.$watch('order', function(order) {
          if (ngModel) {
            ngModel.$setViewValue(order);
          }
        });

        scope.change = function() {
          if (!scope.order) {
            scope.order = 1;
          } else if (scope.order > 0) {
            scope.order = scope.order > 0 ? -1 : 1;
          } else if (scope.order < 0) {
            scope.order = 0;
          }
        };

        scope.$watch("order", (order: number) => {
          scope.absOrder = Math.abs(order);
        });
      }
    };
  }

  angular.module("kindred.components.grid.directives", [])
    .directive("kinGridPagination", gridPaginationDirective)
    .component("kinGridSearch", gridSearchComponent)
    .component("kinGridItems", gridItemsComponent)
    .directive("kinGrid", gridDirective)
    .directive("kinGridTable", gridTableDirective)
    .directive("kinGridCol", gridColDirective)
    .directive("kinGridDataCols", gridDataColsDirective)
    .directive("kinGridEventCols", gridEventColsDirective)
    .directive("kinGridSelCol", gridSelColDirective)
    .directive("kinGridRow", gridRowDirective)
    .directive("kinGridEditCols", gridEditColsDirective)
    .directive("kinSortDir", sortDirDirective)
    .filter("kinGridCell", gridCellFilter);
}
