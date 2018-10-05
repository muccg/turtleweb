/// <reference path="quick-search/directive.ts" />

module kindred {
  'use strict';

  import B = BaseParser;

  // @ngInject
  function queryBoxDirective(kinAddPatientsToStudyGroup: AddPatientsToStudyGroupService,
                             kinCreateReportFromQuery: CreateReportFromQueryService,
                             kinSavedSearch: SavedSearchService): ng.IDirective {
    return {
      restrict: 'E',
      templateUrl: "app/search/query-box.html",
      scope: {},
      bindToController: {
        search: '<',
        onDoubleSearch: '&'
      },
      controllerAs: 'vm',
      controller: class {
        search: Searcher;
        onDoubleSearch: {
          (scope: { item: any; }): void;
        };
        showOptions: boolean;
        ac: SearchAutoComplete;

        // This runs the search, but also checks if the form was
        // submitted twice in succession with the same search.
        submit() {
          var singleResult = this.search.checkRepeatedSearch();
          if (singleResult) {
            this.visit(singleResult);
          } else {
            this.search.search().then(() => {
              if (this.ac) {
                this.ac.hide();
              }
            });
          }
        }

        private visit(item) {
          this.onDoubleSearch({ item: item });
        }

        addToStudyGroup() {
          kinAddPatientsToStudyGroup.addSearch(this.search);
        }

        createReport() {
          kinCreateReportFromQuery.go(this.search);
        }

        createSearch() {
          kinSavedSearch.create(this.search);
        }

        updateSearch() {
          kinSavedSearch.update(this.search);
        }
      },
      link: function(scope, elem, attrs) {
      }
    };
  }

  export class SearchQueryCtrl {
    // @ngInject
    constructor(private baseSearchParser: B.BaseSearchParserService) {
    }

    public parser: ResourceSearchParser;
    public resource: string;
    public text: string;
    public expr: B.SearchQuery;
    public apiExpr: Search.ApiSearchExpr;
    public input: InputDirectiveScope;

    validate(text: string): boolean {
      try {
        return !text || !!this.parse(text);
      } catch (e) {
        return false;
      }
    }

    parse(text: string): Search.ApiSearchExpr {
      return this.parser.parse(this.baseSearchParser.parse(text));
    }
  }

  interface QueryDirectiveScope extends ng.IScope {
    kinQuery: SearchQueryCtrl;
    study: { id: string; };
  }

  // @ngInject
  function queryDirective($parse: ng.IParseService,
                          searchParser: ResourceSearchParserService): ng.IDirective {
    return {
      restrict: 'E',
      require: 'ngModel',
      controller: SearchQueryCtrl,
      controllerAs: 'kinQuery',
      link: function(scope: QueryDirectiveScope,
                     elem: angular.IAugmentedJQueryStatic,
                     attrs: angular.IAttributes,
                     ngModel: angular.INgModelController) {
        attrs.$observe("resource", (resourceExpr: string) => {
          // isolate scope wrecks things, so we parse the resource expr once
          var resource = $parse(resourceExpr)(scope);
          var rootScope = <kindred.RootScope>scope.$root;
          var p = searchParser.make(resource, rootScope.study);
          scope.kinQuery.parser = p;
          scope.kinQuery.resource = resource;
        });

        ngModel.$render = function() {
          scope.kinQuery.text = ngModel.$viewValue;
        };

        scope.$watch("kinQuery.text", function(text) {
          ngModel.$setViewValue(text);
        });

        ngModel.$parsers.push(function(text) {
          try {
            return scope.kinQuery.parse(text);
          } catch (e) {
            if (e.name === "GenParseError" || e.hash) {
              console.warn("Got: " + e.hash.token + ", expected: " + e.hash.expected);
            } else if (e.name === "KeywordParseError") {
              console.warn("Keyword parse error: ", e.reason);
            } else {
              console.warn("some other error: " + e.message);
              ngModel.$error.parse = e.message;
            }
            return undefined;
          }
        });

        ngModel.$formatters.push(function(expr) {
          if (expr) {
            if (scope.kinQuery.parser) {
              return scope.kinQuery.parser.formatStr(expr);
            } else {
              console.warn("bad bad");
            }
          }
        });

      }
    };
  }

  function queryFormDirective(searchParser, searchParserUtil) {
    return {
      restrict: 'E',
      require: '?ngModel',
      templateUrl: "app/patient/query-form.html",
      link: function(scope : any, elem, attrs, ngModel) {
        if (!ngModel) {
          return;
        }

        scope.form = {};

        ngModel.$render = function() {
          var val = ngModel.$viewValue;
          var form = scope.form;

          var set = [];
          var terms = [];

          var copy = function(item) {
            if (_.isString(item)) {
              terms.push(item);
            } else if (item.and) {
              copy(item.and[0]);
              copy(item.and[1]);
            } else if (item.or) {
              copy(item.or[0]);
              copy(item.or[1]);
            } else if (item.not) {
              copy(item.not);
            } else if (item.name) {
              if (item.name === "dob" || item.name === "dod") {
                form[item.name] = searchParserUtil.isoDateRange(item.value);
                set.push(item.name);
              } else if (item.name === "sex") {
                form.sex = item.value.toUpperCase();
                set.push(item.name);
              } else if (item.name === "surname") {
                form.surname = item.value;
                set.push(item.name);
              } else if (item.name === "given") {
                form.given_names = item.value;
                set.push("given_names");
              } else if (item.name === "alias") {
                form.other_names = item.value;
                set.push("other_names");
              } else if (item.name === "study") {
                form.study = item.value;
                set.push(item.name);
              } else if (item.name === "project") {
                form.project = item.value;
                set.push(item.name);
              } else if (item.name === "id") {
                form.id = item.value;
                set.push(item.name);
              } else if (item.name === "alive" || item.name === "deceased") {
                form[item.name] = item.value;
                set.push(item.name);
              }
            }
          };

          var fields = ["surname", "given_names", "other_names", "sex", "id",
                        "study", "project", "alive", "deceased"];

          if (val) {
            copy(val);
            form.terms = terms.join(" ");

            // clear out fields which weren't set
            _(fields).difference(set).each(function(field) {
              form[field] = undefined;
            });
            _(["dob", "dod"]).difference(set).each(function(field) {
              form[field] = {};
            });
          }
        };

        scope.$watch("form", function(form) {
          read();
        }, true);
        //read(); // initialize

        // Write data to the model
        function read() {
          var form = scope.form;

          var s = [];
          if (form.surname) {
            s.push("surname:" + form.surname);
          }
          if (form.given_names) {
            s.push("given:" + form.surname);
          }
          if (form.sex) {
            s.push("sex:" + form.sex);
          }
          _.each(["dob", "dod"], function(d) {
            var range = _.mapValues(form[d], searchParserUtil.anyToMoment);
            var fmt = searchParserUtil.fmtDateRange(range);
            if (fmt) {
              s.push(d + ":" + fmt);
            }
          });
          if (form.id) {
            s.push("id:" + form.id);
          }

          if (form.terms) {
            s.push(form.terms);
          }

          var expr = searchParser.make().parse(s.join(" "));

          // no way this will work properly
          ngModel.$setViewValue(expr);
        }
      }
    };
  }

  interface HTMLInputElement2 extends HTMLInputElement {
    selectionDirection: string;
  }

  interface Sel {
    caretPos: number;
    start: number;
    end: number;
  }

  export interface InputDirectiveScope extends ng.IScope {
    rawText: string;
    caretPos: number;
    insertText: (text: string, spaceAfter: boolean, removeChars?: number) => void;
    insertBrackets: (open: string, close: string) => void;
    focus: () => void;
  }

  // @ngInject
  function queryInputDirective($document, $timeout: angular.ITimeoutService,
                               baseSearchParser: B.BaseSearchParserService): ng.IDirective {
    return {
      restrict: "A",
      require: ["^kinQuery", "ngModel"],
      link: function(scope: InputDirectiveScope, elem, attrs,
                     [kinQuery, ngModel]: [SearchQueryCtrl, ng.INgModelController]) {
        var el = <HTMLInputElement2>elem[0];
        kinQuery.input = scope;

        var getSel = function(): Sel {
          if (typeof el.selectionStart === "number") {
            return {
              caretPos: el.selectionDirection === "backward" ?
                el.selectionStart : el.selectionEnd,
              start: el.selectionStart,
              end: el.selectionEnd
            };
          } else if ($document.selection) {
            // IE
            // fixme: check this doesn't break focus
            el.focus();
            var sel = $document.selection.createRange();
            sel.moveStart('character', -el.value.length);
            // fixme: selection range not supported
            return {
              caretPos: sel.text.length,
              start: sel.text.length,
              end: sel.text.length
            }
          }
        };

        var setSel = function(sel: Sel) {
          el.selectionStart = sel.start;
          el.selectionEnd = sel.end;
          el.selectionDirection = "forwards";
        };

        elem.on("keydown click focus change paste", function(e) {
          $timeout(function() {
            var pos = getSel().caretPos;
            var text = el.value;
            scope.$apply(() => {
              scope.caretPos = pos;
              scope.rawText = text;
            });
          });
        });

        scope.$watch("caretPos", function(pos) {
          //console.log("caret pos is " + pos);
        });

        var focusChange = function() {
          $timeout(function() {
            el.focus();
            elem.change();
          });
        };

        var spaceConcat = function(...items: string[]): string {
          // fixme: collapse whitespace between items
          return items.join("");
        };

        scope.insertText = (text: string, spaceAfter: boolean, removeChars?: number) => {
          var front = el.value.substring(0, scope.caretPos - (removeChars || 0));
          var back = el.value.substring(scope.caretPos, el.value.length);
          el.value = spaceConcat(front, text, spaceAfter ? " " : "", back);
          focusChange();
        };

        scope.insertBrackets = (open, close) => {
          var sel = getSel();
          var front = el.value.substring(0, sel.start);
          var mid = el.value.substring(sel.start, sel.end);
          var back = el.value.substring(sel.end, el.value.length);
          el.value = front + open + mid + close + back;
          setSel({
            start: front.length + open.length,
            end: front.length + open.length + mid.length,
            caretPos: front.length + open.length + mid.length
          });
          focusChange();
        };

        scope.focus = () => {
          $timeout(() => el.focus());
        };

        ngModel.$validators["searchExpr"] = function(modelValue, viewValue) {
          return kinQuery.validate(modelValue || viewValue);
        };
      }
    };
  }

  class ShowQueryController {
    public query: Search.ApiSearchExpr;
    public resource: string;
    public study: Models.Study;

    public text: string;
    private parser: ResourceSearchParser;

    // @ngInject
    constructor($scope: ng.IScope, private searchParser: ResourceSearchParserService) {
      var update = () => this.update();
      $scope.$watch("query", update);
      $scope.$watch("vm.resource", update);
      $scope.$watch("vm.study", update);
    }

    private update() {
      this.parser = this.resource ? this.searchParser.make(this.resource, this.study) : null;
      this.text = this.fmt(this.query, this.parser);
    }

    fmt(val: Search.ApiSearchExpr, parser: ResourceSearchParser): string {
      return (val && parser) ? parser.formatStr(val): "";
    }
  }

  // @ngInject
  function showQueryDirective(): ng.IDirective {
    return {
      restrict: "E",
      template: "<pre>{{ vm.text|fillBlank:'(All records)' }}</pre>",
      controller: ShowQueryController,
      controllerAs: "vm",
      bindToController: {
        query: "=",
        resource: "=",
        study: "="
      },
      scope: {},
      link: function(scope, elem, attrs) {
      }
    };
  }

  angular.module("kindred.search.directives", [])
    .directive("kinQuickSearch", quickSearchDirective)
    .directive("kinQueryBox", queryBoxDirective)
    .directive("kinQuery", queryDirective)
    .directive("kinQueryForm", queryFormDirective)
    .directive("kinQueryInput", queryInputDirective)
    .directive("kinShowQuery", showQueryDirective);
}
