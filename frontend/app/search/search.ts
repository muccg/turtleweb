/// <reference path="util.ts" />

module kindred {
  'use strict';

  import B = BaseParser;
  import K = SearchKeywords;
  import P = SearchParser;
  import S = Search;

  export class KeywordParseError {
    public name = "KeywordParseError";
    constructor(public message: string, public reason: string) {
    }
  }

  export class ResourceSearchParserService {
    private keywords: K.Keyword[];

    // @ngInject
    constructor(private kinQueryKeywords: K.QueryKeywordsService,
                private baseSearchParser: B.BaseSearchParserService) {
    }

    make(resource: string, study?): ResourceSearchParser {
      var keywords = this.kinQueryKeywords.getAsync(study);
      return new ResourceSearchParser(resource, keywords, this.baseSearchParser);
    }
  }

  export class ResourceSearchParser {
    constructor(private resource: string,
                private keywords: K.AllKeywords,
                private baseSearchParser: B.BaseSearchParserService) {
    }
    parse(expr: B.SearchQuery): S.ApiSearchExpr {
      var parseValue = (keyword: K.Keyword, value: string): S.ApiSearchFieldValue => {
        if (!value) {
          // blank values are always permitted
          return value;
        }

        if (!keyword.type || keyword.type === "string") {
          var kstr = <K.KeywordString>keyword;
          if (kstr.enum) {
            var lower = s => s.toLowerCase();
            var matches = _(kstr.enum)
              .filter(item => lower(item).indexOf(lower(value)) >= 0);
            if (!matches.isEmpty()) {
              return value;
            } else {
              throw new KeywordParseError("Value is not in enum", "enum");
            }
          } else if (kstr.regexp) {
            if (value.match(kstr.regexp)) {
              return value;
            } else {
              throw new KeywordParseError("Value doesn't match regexp", "regexp");
            }
          } else {
            return value;
          }
        } else if (keyword.type === "boolean") {
          var bools = ["true", "false", "yes", "no",
                       "1", "0", "t", "f", "y", "n"];
          var trues = ["t", "y", "1"];
          if (typeof value === "string") {
            value = value.toLowerCase();
            if (_.includes(bools, value)) {
              return _.includes(trues, value[0]);
            } else {
              throw new KeywordParseError("Value isn't boolean", "boolean");
            }
          } else {
            return value;
          }
        } else if (keyword.type === "number") {
          var intVal = parseInt(value, 10);
          if (_.isNumber(intVal)) {
            return intVal;
          } else {
            throw new KeywordParseError("Is not a number", "number");
          }
        } else if (keyword.type === "date") {
          var range = P.parseDateRange(value);
          if (!range) {
            throw new KeywordParseError("Couldn't parse date range", "date");
          }
          return P.isoDateRange(range);
        } else if (keyword.type === "resourceId") {
          var k = <K.KeywordResource>keyword;
          return value;
        } else if (keyword.type === "search") {
          return value;
        } else {
	  return value;
	}
      };

      var keywordToApi = (name: string[], value: string): S.ApiSearchFieldValue => {
        var keyword = K.findKeyword(this.keywords, name, this.resource);
        if (keyword) {
          return parseValue(keyword, value);
        } else {
          throw new KeywordParseError("Unknown keyword " + name[0], "keyword");
        }
      }

      return S.exprToApi(expr, keywordToApi);
    }

    isValid(expr: B.SearchQuery): boolean {
      return expr === null || !!this.parse(expr);
    }

    format(expr: S.ApiSearchExpr): B.SearchQuery {
      var fmtValue = (keyword: K.Keyword, value: S.ApiSearchFieldValue): string => {
        if (!value) {
          return "";
        } else if (!keyword.type || keyword.type === "string") {
          return <string>value;
        } else if (keyword.type === "boolean") {
          return value === true ? "true" : value === false ? "false" : "";
        } else if (keyword.type === "number") {
          return "" + value;
        } else if (keyword.type === "date") {
          return P.fmtDateRange(P.unIsoDateRange(value));
        } else if (keyword.type === "resourceId") {
          return <string>value;
        } else if (keyword.type === "search") {
          return <string>value;
        } else if (_.isString(value)) {
	  return <string>value;
	}
      };

      var keywordFromApi = (name: string[], value: S.ApiSearchFieldValue): string => {
        var keyword = K.findKeyword(this.keywords, name, this.resource);
        if (keyword) {
          return fmtValue(keyword, value);
        } else {
          throw new KeywordParseError("Unknown keyword " + name[0], "keyword");
        }
      }

      return S.exprFromApi(expr, keywordFromApi);
    }

    formatStr(expr: S.ApiSearchExpr): string {
      return P.format(this.format(expr));
    }
    parseStr(query: string): S.ApiSearchExpr {
      return this.parse(this.baseSearchParser.parse(query));
    }

    // fixme: need a higher-level expected function
    getExpected(text: string, pos: number): B.ExpectedInfo {
      return this.baseSearchParser.getExpected(text, pos);
    }
  }

  export interface ApiPaging {
    limit?: number;
    offset?: number;
  }

  export class Paging {
    constructor(public pageSize?: number, public current = 1) {
    }

    toApi(): ApiPaging {
      // returns a tastypie paging query from ng-grid paging options
      var params: ApiPaging = {};
      if (this.pageSize) {
        params.limit = this.pageSize;
        params.offset = this.current ? (this.current - 1) * this.pageSize : 0;
      }
      return params;
    }

    fromApi(tp: ApiPaging): Paging {
      // sets ng-grid paging options from tastypie query with limit+offset
      var paging = new Paging();
      if (tp && tp.limit) {
        paging.pageSize = tp.limit;
        paging.current = Math.floor(tp.offset / tp.limit) + 1;
      } else {
        paging.pageSize = 0;
        paging.current = 1;
      }
      return paging;
    }
  }

  export interface SearchFields {
    /** column sort-fields, maybe prefixed by - */
    sort: string[];
    /** column headings to be shown */
    show: string[];
    /** column fields to be exported */
    xport: string[];
  }

  export class Searcher {
    private resource: any;

    // search results
    items: Models.Any[];
    totalCount: number;
    searchCount: number;
    searching: boolean;
    error: string;
    csvLink: string;
    queryTime: number;

    // search params
    expr: S.ApiSearchExpr;
    paging: Paging;
    fields: SearchFields;
    context: {};

    /** current saved search */
    saved: Models.Search;

    /** used for aborting previous search  */
    private abortRequest: ng.IDeferred<{}>;

    /** store search parameters to prevent double searches */
    private currentParams: {};
    /** request corresponding to currentParams*/
    private currentRequest: ng.IPromise<Searcher>

    /** after enabling there is a short refresh debounce interval */
    private refreshDebounceTime: number;
    private debounceTimeout: ng.IPromise<Searcher>;

    /** prevent executing searches before all parameters are in order */
    private enabled = false;

    // @ngInject
    constructor(private Restangular: restangular.IService,
                private kinCsvLink: CsvLinkService,
                private $q: ng.IQService,
                private $timeout: ng.ITimeoutService,
                public what: string,
                public study: Models.Study) {
      this.resource = Restangular.all(what);
      this.items = undefined;
      this.expr = null;
      this.paging = new Paging();
      this.totalCount = null;
      this.searchCount =  0; // number of searches performed (API queries)
      this.searching = false;
      this.error = null;
      this.disable();
    }

    private jsonQuery(expr: S.ApiSearchExpr) {
      return _.isEmpty(expr) ? {} : {
        jq: angular.toJson(expr)
      };
    }

    private studyContext() {
      return this.study ? { study: this.study.id } : {};
    }

    private getParams() {
      return _.extend(this.getOrderBy(),
                      this.jsonQuery(this.expr),
                      this.studyContext(),
                      this.context);
    }

    private getOrderBy() : { order_by?: string[] } {
      return this.fields && this.fields.sort.length > 0 ? {
        order_by: this.fields.sort
      } : {};
    }

    private getFieldParams(): { c?: string[] } {
      return this.fields && this.fields.xport.length > 0 ? { c: this.fields.xport } : {};
    }

    getCsvLink(): string {
      var csvParams = _.extend({}, this.getParams(), this.getFieldParams());
      return this.kinCsvLink.url(this.resource, this.study ? this.study.slug : null, csvParams);
    }

    clear() {
      this.expr = null;
      this.paging = new Paging();
    }

    clearAndRefresh() {
      this.clear();
      this.search();
    }

    search() {
      this.paging.current = 1;
      return this.refresh();
    }

    private onItemsReceived(searchCount, startTime, items) {
      if (searchCount === this.searchCount) {
        this.items = items;
        this.totalCount = items.metadata.total_count;
        this.paging = this.paging.fromApi(items.metadata);
        this.searching = false;
        this.queryTime = moment().diff(startTime) / 1000;
      }
    }
    private onError(searchCount, error) {
      if (searchCount === this.searchCount) {
        console.error("that was bad", error);
        this.searching = false;
        this.error = error.statusText || "Error";
        this.queryTime = null;
      }
    }

    private abortCurrentRequest() {
      if (this.abortRequest) {
        this.abortRequest.resolve();
      }
    }

    enable() {
      if (!this.enabled) {
        this.refresh();
      }
      this.enabled = true;
    }

    disable() {
      this.enabled = false;
      this.refreshDebounceTime = 100;
      this.debounceTimeout = null;
      this.currentRequest = null;
      this.currentParams = null;
    }

    /**
     * Assembles parameters and makes a request (maybe).
     */
    refresh() {
      if (this.enabled) {
        this.csvLink = this.getCsvLink();
        return this.debouncedRefresh();
      }
    }

    /**
     * Prevent launching off 2 or 3 requests while the parameters
     * settle down. After first timeout period, debouncing will be
     * disabled.
     */
    private debouncedRefresh() {
      var action = () => {
        this.debounceTimeout = null;
        return this.doRefresh();
      };

      if (this.refreshDebounceTime) {
        if (!this.debounceTimeout) {
          this.debounceTimeout = this.$timeout(this.refreshDebounceTime)
            .then(action);
          this.refreshDebounceTime = 0;
        }
        return this.debounceTimeout;
      } else {
        return action();
      }
    }

    /**
     * Run a query if the search params were different from last time.
     */
    private doRefresh() {
      var params = _.assign({}, this.getParams(), this.paging.toApi());
      if (!angular.equals(params, this.currentParams) || this.error) {
        this.currentParams = params;
        this.currentRequest = this.doRefresh2(params);
      }
      return this.currentRequest;
    }

    private doRefresh2(params) {
      this.abortCurrentRequest();
      this.searching = true;
      this.error = null;
      return this.runQuery(params);
    }

    private runQuery(params): ng.IPromise<Searcher> {
      return ((searchCount, startTime) => {
        this.abortRequest = this.$q.defer();
        return this.resource
          .withHttpConfig({
            timeout: this.abortRequest.promise
          })
          .getList(params)
          .then(items => this.onItemsReceived(searchCount, startTime, items),
                error => this.onError(searchCount, error))
          .then(() => this)
          .finally(() => { this.abortRequest = null; });
      })(++this.searchCount, moment());
    }

    is_blank() {
      return _.isEmpty(this.expr) ||
        (typeof this.expr !== "string" && _.every(<any>this.expr, _.isEmpty));
    }

    private prevExpr: Search.ApiSearchExpr;
    checkRepeatedSearch() {
      if (this.expr) {
        if (_.isEqual(this.prevExpr, this.expr) &&
            this.items && this.items.length === 1) {
          return this.items[0];
        }
      }

      this.prevExpr = this.expr;
    }

    loadSaved(search: Models.Search) {
      this.saved = search;
      this.expr = search.query;
      this.fields = {
        sort: search.order_by,
        show: search.list_columns,
        xport: []
      };
      //this.refresh();
    }
  }

  /* This service makes queries to the api and holds the current
   * query, search results and search state. It's a factory class, so after
   * injecting it, you apply it to a Restangular list resource, and
   * put the resulting object into the scope. */
  export class SearcherService {
    // @ngInject
    constructor(private Restangular: restangular.IService,
                private kinCsvLink, private $q, private $timeout)  {
    }
    private current: {
      // map indices are resource uris
      [index: string]: {
        // map indices are study resource uris
        [index: string]: Searcher;
      };
    } = {};

    private getSearcher(resource: string, study=null) {
      var studyUri = study ? (study.resource_uri || study) : "";
      if (!this.current[resource]) {
        this.current[resource] = {};
      }
      if (!this.current[resource][studyUri]) {
        this.current[resource][studyUri] = this.makeSearcher(resource, study);
      }
      return this.current[resource][studyUri];
    }

    private makeSearcher(resource, study) {
      return new Searcher(this.Restangular, this.kinCsvLink, this.$q, this.$timeout, resource, study);
    }

    make(resource: string, study = null, context?: {}, singleton = true) {
      var searcher = singleton ?
        this.getSearcher(resource, study) :
        this.makeSearcher(resource, study);
      searcher.context = context;
      return searcher
    }

    loadSavedSearch(search) {
      var searcher = this.getSearcher(search.resource, search.study);
      searcher.loadSaved(search);
    }
  }

  export class CsvLinkService {
    private csvView: string;
    // @ngInject
    constructor(appConfig: AppConfig, private $httpParamSerializer) {
      this.csvView = appConfig.urls["csv_download"];
    }

    url(resource, study?: string, params?: {}) {
      var qs = this.$httpParamSerializer(params);
      return this.viewUrl(resource.route, study) + "?" + qs;
    }

    private viewUrl(resource: string, study?: string) {
      return this.csvView.replace("/person", "/" + (study || "_") + "/" + resource);
    }
  }

  angular.module("kindred.search.services", [])
    .service("kinQueryKeywords", K.QueryKeywordsService)
    .service("searchParser", ResourceSearchParserService)
    .service("kinSearcher", SearcherService)
    .service("kinCsvLink", CsvLinkService)
    .factory("searchParserUtil", function() {
      return {
        dateFill: P.dateFill,
        dateUnFill: P.dateUnFill,
        fmtDateRange: P.fmtDateRange,
        parseDateRange: P.parseDateRange,
        anyToMoment: P.anyToMoment,
        isoDateRange: P.isoDateRange,
        unIsoDateRange: P.unIsoDateRange,
        format: P.format
      };
    });
}
