module kindred {
  'use strict';

  interface QueryAutoCompleteScope extends ng.IScope {
    info: SearchAutoComplete;
  }

  // @ngInject
  function queryAutoComplete(kinStudies: kindred.StudiesService,
                                    kinQueryAutoCompletePos: QueryAutoCompletePosService,
                                    kinQueryKeywords,
                                    kinEventTypes): ng.IDirective {
    return {
      restrict: 'A',
      require: ['^kinQuery', '^ngModel'],
      priority: 0,
      scope: {
        info: "=kinQueryAutoComplete"
      },
      link: function(scope: QueryAutoCompleteScope, elem, attrs, ctrls) {
        var kinQuery: SearchQueryCtrl = ctrls[0];
        var ngModel: angular.INgModelController = ctrls[1];
        if (!scope.info) {
          scope.info = new SearchAutoComplete(kinQueryKeywords, kinQuery, kinStudies.current);
        }

        kinQueryAutoCompletePos.listen(elem, function(show, focus, pos) {
          scope.$apply(scope2 => {
            scope.info.show = show;
            scope.info.focus = focus;
            scope.info.pos = pos;
          });
        });

        scope.$watch(function() {
          return { text: kinQuery.input.rawText, pos: kinQuery.input.caretPos };
        }, function(x) {
          if (angular.isDefined(x.text) && angular.isDefined(x.pos)) {
            scope.info.expected = kinQuery.parser.getExpected(x.text, x.pos);
          }
        }, true);

        scope.$watch("info.expected", function(expected) {
          if (expected) {
            scope.info.updatePossible();
          }
        });
      }
    };
  }

  class QueryAutoCompleteMenuCtrl {
    // directive scope bindings
    info: SearchAutoComplete;
    pos: { top: number, left: number };

    // scope variables
    keywordPages: K.Keyword[][];
    currentKeywords: K.Keyword[];
    currentPage: number;
    numPages: number;
    // submenus indexed by keyword group id
    menus: {
      [index: string]: K.Keyword[];
    };
    // mapping of keyword group id to parent group id
    parentMenus: {
      [index: string]: K.KeywordGroupId;
    };
    // viewing which submenu
    currentMenu: string;

    // controller vars
    kinQuery: SearchQueryCtrl;
    pageSize: number = 10;

    private input() {
      return this.kinQuery.input;
    }

    closeMenu() {
      this.info.show = false;
    };

    completeKeyword(keyword, $event) {
      this.closeMenu();
      this.input().insertText(this.info.completeKeyword(keyword), false);
    };

    insertExpr(text, $event) {
      this.input().insertText(text, true);
    };

    insertBrackets() {
      this.input().insertBrackets("(", ")");
    };

    completeValue(value, $event) {
      this.closeMenu();
      var { add, remove } = this.info.completeValue(value);
      this.input().insertText(add, true, remove);
    };

    /**
     * When the keyword list changes, go through the keywords, arrange
     * them into groups, and slice into pages.
     */
    repaginate() {
      var keyword = this.info.level.keyword || this.info.level.keywordRelated;
      if (keyword) {
        var groupEntries = [];
        var groups = [];
        var possibleKeywords = this.info.possibleKeywords || [];
        if (keyword.current) {
          // Don't group keywords when there is already something
          // partially entered. Since they are ungrouped, remove
          // names duplicated between groups.
          var removeGroup = k => <K.KeywordResource>_.assign({}, k, {group: null});
          possibleKeywords = _.map(possibleKeywords, removeGroup);
          possibleKeywords = _.uniqBy(possibleKeywords, k => k.name);
        } else {
          // extract groups from keywords
          groups = _(possibleKeywords)
            .map(k => k.group)
            .filter(_.identity)
            .uniqBy(g => g ? g.id : "")
            .sortBy("order")
            .valueOf();
          var groupMap = _.keyBy(groups, g => g.id);

          // create menu entries for all the groups
          groupEntries = _(groups).map(group => {
            return {
              type: "group",
              name: group.title,
              id: group.id,
              group: groupMap[group.group],
              sub: null,
              order: group.order
            };
          }).valueOf();
        }

        // merge keyword menu items and group submenus
        var keywordsAndGroups = _(possibleKeywords)
          .concat(groupEntries)
          .sortBy(k => !!k.group || k.type === "group",
                  k => k.group ? k.group.id : "",
                  k => k.type !== "group",
                  k => k.order)
          .valueOf();
        this.menus = _.groupBy(keywordsAndGroups, k => k.group ? k.group.id : "");

        // allow navigation back up through the menus
        this.parentMenus = <any>_.fromPairs(_.map(groups, g => [g.id, g.group || ""]));

        // setup submenu links
        _.each(keywordsAndGroups, k => {
          if (k.type === "group" && k.id) {
            k.sub = this.menus[k.id];
          }
        });

        this.setMenu("");
      } else {
        this.numPages = 1;
        this.setPage(0);
      }
    }

    setMenu(groupId: string) {
      this.currentMenu = groupId;
      this.keywordPages = _.chunk(this.menus[groupId], this.pageSize);
      this.numPages = this.keywordPages.length;
      this.setPage(0);
    }

    // link click handler in template
    changePage(dir: number) {
      this.setPage(this.currentPage + dir);
      this.input().focus();
    }

    setPage(n: number) {
      this.currentPage = Math.max(0, Math.min(this.numPages - 1, n));
      if (this.keywordPages) {
        this.currentKeywords = this.keywordPages[this.currentPage];
      }
    }

    // click handler in template
    enterSub(keyword: K.BaseKeyword) {
      this.setMenu(keyword["id"]);
    }

    // click handler in template
    exitSub() {
      this.setMenu(this.parentMenus[this.currentMenu]);
    }
  }

  // @ngInject
  function queryAutoCompleteMenu($animate: ng.animate.IAnimateService, $document: ng.IDocumentService): ng.IDirective {
    return {
      restrict: 'E',
      scope: {
        info: '=',
        pos: '='
      },
      controller: QueryAutoCompleteMenuCtrl,
      controllerAs: "vm",
      bindToController: true,
      require: ["kinQueryAutoCompleteMenu", "^kinQuery"],
      templateUrl: "app/search/autocomplete/menu.html",
      link: function(scope, elem, attrs,
                     [ctrl, kinQuery]: [QueryAutoCompleteMenuCtrl, SearchQueryCtrl]) {
        ctrl.kinQuery = kinQuery;

        // place menu under input box and toggle visibility
        scope.$watch("vm.pos+vm.info.show+vm.info.focus", () => {
          var ac = elem.find(".kin-query-auto-complete");
          if (ctrl.pos) {
            elem.offset(ctrl.pos);
          }
          if (ctrl.info.show && ctrl.info.focus) {
            $animate.addClass(ac, "open");
          } else {
            $animate.removeClass(ac, "open");
          }
        }, true);

        // update menu when possible keywords are updated
        scope.$watch("vm.info.possibleKeywords", () => {
          ctrl.repaginate();
        });
        scope.$watch("vm.info.level.value.keyword", () => {
          ctrl.repaginate();
        }, true);
      }
    };
  }

  import K = SearchKeywords;

  interface CompleteInsertFunc {
    (params: { acValue: {} }): void;
  }

  class AutoCompleteValueOptionsCtrl {
    keyword: K.Keyword;
    current: string;
    insert: CompleteInsertFunc;
    options: {
      label: string;
      item: any;
      title?: string;
      indent?: number;
    }[];
    numPages: number;
    currentPage: number;
    pageSize: number;

    // @ngInject
    constructor($scope: ng.IScope,
                private kinStudies: kindred.StudiesService,
                private kinDdl: kindred.DdlService,
                private kinEventTypes: kindred.EventTypesService) {
      $scope.$watch("vm.keyword.resource+vm.current+vm.currentPage", () => {
        var keyword = <K.KeywordResource>this.keyword;
        if (keyword.resource === "eventtype") {
          this.setupEventTypes();
        } else {
          this.setupOptionsList(keyword);
        }
      });
    }

    private get study(): Models.Study {
      return this.kinStudies.current;
    }

    private setupOptionsList(keyword: K.KeywordResource) {
      var q = {
        limit: this.pageSize,
        offset: this.pageSize * this.currentPage
      };

      if (this.current) {
        q[(keyword.attr || "name") + "__icontains"] = this.current;
      }

      if (keyword.limitStudy) {
        q[keyword.limitStudy] = this.study.id;
      }

      this.kinDdl.get(keyword.resource, q).then(items => {
        this.options = _.map(items, item => {
          return {
            label: item[keyword.attr || 'name'],
            item: item,
            title: keyword.titleAttr ? item[keyword.titleAttr] : null
          };
        });
        this.numPages = Math.ceil(items["metadata"].total_count / this.pageSize);
        this.currentPage = Math.max(0, Math.min(this.currentPage, this.numPages - 1));
      });
    }

    private setupEventTypes() {
      this.kinEventTypes.load(this.study).then((eventTypes) => {
        this.options = _(eventTypes).filter((et) => {
          return !this.current || et.name.toLowerCase().indexOf(this.current.toLowerCase()) == 0;
        }).map((et) => {
          return {
            label: et.name,
            item: et,
            indent: (<any>et).depth
          };
        }).valueOf();
      });
    }

    selectOption(opt: { label: string; item: any }) {
      this.insert({ acValue: opt ? opt.label : "" });
    }
  }

  function queryAutoCompleteValueOptions(): ng.IDirective {
    return {
      restrict: 'E',
      scope: {
        keyword: '=',
        current: '=',
        numPages: '=',
        currentPage: '=',
        pageSize: '=',
        insert: '&'
      },
      templateUrl: "app/search/autocomplete/value-options.html",
      controller: AutoCompleteValueOptionsCtrl,
      controllerAs: 'vm',
      bindToController: true
    };
  }

  interface SearchModel {
    name: string;
    desc: string;
    resource: string;
  }

  class AutoCompleteSavedSearchesCtrl {
    keyword: K.KeywordSearch;
    current: string;
    insert: CompleteInsertFunc;
    options: SearchModel[];

    // @ngInject
    constructor($scope: ng.IScope,
                private kinStudies: kindred.StudiesService,
                private Restangular: restangular.IService,
                private kinEventTypes: kindred.EventTypesService) {
      $scope.$watch("vm.keyword.resource+vm.current", () => {
        this.setupOptionsList(this.keyword);
      });
    }

    private get study(): Models.Study {
      return this.kinStudies.current;
    }

    private setupOptionsList(keyword: K.KeywordSearch) {
      var q: any = {
        limit: 10,
        name__istartswith: this.current,
        resource: keyword.resource
      };
      if (this.study) {
        q.study = this.study.id;
      }

      this.Restangular.all("search").getList(q).then((items) => {
        this.options = items;
      });
    }

    selectOption(opt: SearchModel) {
      this.insert({ acValue: opt ? opt.name : "" });
    }
  }

  function queryAutoCompleteSavedSearches(): ng.IDirective {
    return {
      restrict: 'E',
      scope: {
        keyword: '=',
        current: '=',
        insert: '&'
      },
      templateUrl: "app/search/autocomplete/saved-searches.html",
      controller: AutoCompleteSavedSearchesCtrl,
      controllerAs: 'vm',
      bindToController: true
    };
  }

  angular.module("kindred.search.autocomplete.directives", [])
    .directive("kinQueryAutoCompleteMenu", queryAutoCompleteMenu)
    .directive("kinQueryAutoComplete", queryAutoComplete)
    .directive("kinQueryAutoCompleteValueOptions", queryAutoCompleteValueOptions)
    .directive("kinQueryAutoCompleteSavedSearches", queryAutoCompleteSavedSearches);
}
