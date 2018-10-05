module kindred {
  'use strict';

  export interface DropDownListEntry {
    resource: string;
    id: string|number;
    list: Models.AbstractNameList|Models.CustomDropDownList;
  }

  /**
   * The list of drop-down lists.
   */
  export class DdlListService {
    public lists: DropDownListEntry[];
    private listId: { [index: string]: DropDownListEntry; };
    public namelists: Models.AbstractNameList[];
    public ddls: Models.CustomDropDownList[];
    private abstractnamelist: restangular.IElement;
    private customdropdownlist: restangular.IElement;
    private aPromise: ng.IPromise<Models.AbstractNameList[]>;
    private cPromise: ng.IPromise<Models.CustomDropDownList[]>;

    // @ngInject
    constructor(private $q: ng.IQService, private Restangular: restangular.IService) {
      this.abstractnamelist = Restangular.all("abstractnamelist");
      this.customdropdownlist = Restangular.all("ddl");
      this.lists = [];
      this.listId = {};
    }

    private fetchBuiltin() {
      if (!this.aPromise) {
        this.aPromise = this.abstractnamelist.getList({ limit: 0 })
          .then(lists => {
            this.namelists = lists;
            this.mergeLists();
            return lists;
          });
      }
      return this.aPromise;
    }

    private fetchCustom(refresh?: boolean) {
      if (!this.cPromise || refresh) {
        this.cPromise = this.customdropdownlist.getList({ limit: 0 })
          .then(lists => {
            this.ddls = lists;
            this.mergeLists();
            return lists;
          });
      }
      return this.cPromise;
    }

    private mergeLists() {
      var hide = { customdropdownlist: true, customdropdownvalue: true };
      this.lists.splice(0, this.lists.length);
      _.each(this.namelists, list => {
        if (!hide[list.endpoint]) {
          this.lists.push({
            resource: "abstractnamelist",
            id: list.endpoint,
            list: list
          });
        }
      });
      _.each(this.ddls, list => {
        this.lists.push({
          resource: "ddl",
          id: list.id,
          list: list
        });
      });
      this.lists.sort((a, b) => {
        return a.list.name.toLowerCase().localeCompare(b.list.name.toLowerCase());
      });

      this.listId = _.keyBy(this.lists, list => "" + list.id);

      return this.lists;
    }

    refresh() {
      return this.fetchCustom(true);
    }

    getLists(): PromiseNow<DropDownListEntry[]> {
      var promise = <any>this.$q.all([this.fetchBuiltin(), this.fetchCustom()])
        .then(() => this.lists);
      promise.$object = this.lists;
      return promise;
    }

    getListInfo(idOrResource: number|string) {
      return this.listId["" + idOrResource];
    }
  }

  function tryNumber(idOrResource: number|string) {
    if (typeof idOrResource === "string") {
      var id = parseInt(idOrResource, 10);
      if (_.isFinite(id)) {
        return id;
      }
    }
    return idOrResource;
  }

  /**
   * Two types of drop-down lists:
   *   1. Builtin AbstractNameList with own API endpoint.
   *   2. CustomDropDownList referenced by CustomDropDownValue.
   */
  export interface DdlItem extends Models.AbstractNameListItem {
    list?: number; // From CustomDropDownValue
  }

  /** restangular augmented promise */
  export interface DdlItemsPromise<T extends DdlItem> extends ng.IPromise<T[]> {
    $object?: T[]
  }

  class CacheEntry<T extends DdlItem> {
    promise: DdlItemsPromise<T>;
    items: T[];
    idMap: { [index: number]: T };
    created: moment.Moment;

    constructor(promise: DdlItemsPromise<T>) {
      this.promise = promise.then((items: T[]) => {
        this.items = items;
        this.idMap = _.keyBy(items, "id");
        this.created = moment();
        return items;
      });

      // preserve restangular's immediate object
      this.promise["$object"] = promise["$object"];
    }
  }

  /**
   * How to identify a dropdown list:
   *   1. Refer to AbstractNameList by its API resource name.
   *   2. Refer to CustomDropDownList by its ID (can be a number or a
   *      stringified number).
   */
  export type DdlRef = string | number;

  /**
   * A convenient cache of drop-down list values.
   * Would be nice to have a general-purpose caching models layer
   * which understands relations between resources.
   */
  export class DdlService {
    private cache: {
      [index: string /* resource_name or ddl_id */]: CacheEntry<DdlItem>;
    };

    // @ngInject
    constructor(private Restangular,
                private $q: ng.IQService,
                private crud: CrudService) {
      this.cache = {};
    }

    /**
     * Returns a promise to fetch a name list.
     * The list will be cached, unless there are params supplied.
     */
    get<T extends DdlItem>(idOrResource: DdlRef, params?: {}): DdlItemsPromise<T> {
      var key = this.cacheKey(idOrResource);
      var promise;
      if (_.isEmpty(params)) {
        if (!this.cache[key]) {
          promise = this.fetchList(idOrResource);
          this.cache[key] = new CacheEntry(promise);
          promise.catch(error => {
            delete this.cache[key];
          });
        } else {
          promise = this.cache[key].promise;
        }
      } else {
        promise = this.fetchList(idOrResource, params);
      }
      return promise;
    }

    private fetchList(idOrResource: DdlRef, params?: {}): ng.IPromise<DdlItem[]> {
      idOrResource = tryNumber(idOrResource);
      if (typeof idOrResource === "number") {
        params = _.assign({}, params, { list: idOrResource });
        return this.fetchList2("ddv", params);
      } else {
        return this.fetchList2(idOrResource, params);
      }
    }

    private fetchList2(resource: string, params?: {}): ng.IPromise<DdlItem[]> {
      var rPromise = this.Restangular.all(resource)
        .getList(_.assign({ limit: 0 }, params));
      var promise = rPromise.then(list => this.orderList(list));
      // preserve restangular's immediate result array
      promise["$object"] = rPromise["$object"];
      return promise;
    }

    /**
     * Ensure list items are sorted by the order field.
     */
    private orderList(list) {
      list.sort((a, b) => {
        return b.order - a.order;
      });
      return list;
    }

    private cacheKey(idOrResource: DdlRef) {
      return "" + idOrResource;
    }

    /**
     * Helpful to call this after editing items of the list.
     */
    dropCache(idOrResource: DdlRef) {
      delete this.cache[this.cacheKey(idOrResource)];
    }

    /**
     * Fetches a drop-down list item.
     * If its list has already been fetched, it will pluck the item out
     * of the DDL cache.
     */
    getListItem(idOrResource: number|string, id: string): ng.IPromise<DdlItem> {
      idOrResource = tryNumber(idOrResource);

      // look for an already cached collection
      var key = this.cacheKey(idOrResource);
      var entry = this.cache[key];
      if (entry && entry.promise) {
        return entry.promise.then(() => {
          if (entry.idMap[id]) {
            return entry.idMap[id];
          } else {
            return this.fetchListItem(idOrResource, id);
          }
        });
      }

      return this.fetchListItem(idOrResource, id);
    }

    /**
     * Returns an already fetched list item from the cache.
     */
    getListItemNow(idOrResource: number|string, id: string): DdlItem {
      var key = this.cacheKey(tryNumber(idOrResource));
      var entry = this.cache[key];
      return entry && entry.idMap ? entry.idMap[id] : undefined;
    }

    private fetchListItem(idOrResource: number|string, id: string) {
      if (typeof idOrResource === "number") {
        return this.Restangular.one("ddv", id).get();
      } else {
        return this.Restangular.one(idOrResource, id).get();
      }
    }

    /**
     * Fetches a DDL item by resource_uri.
     * If its list has already been fetched, it will pluck the item out
     * of the DDL cache.
     */
    getUri(uri: string) {
      if (uri) {
        var parsed = this.crud.fullParseResourceUri(uri);
        if (parsed) {
          return this.getListItem(parsed.resource, parsed.id);
        }
      }
      return this.$q.resolve(null);
    }

    /**
     * Fetches a ddl and returns its default item (if any)
     */
    getDefaultMaybe(resource: string|number): ng.IPromise<DdlItem> {
      return this.get(resource).then(items => {
        return _.find(items, item => item.default);
      });
    }

    /**
     * Fetches a ddl and returns its default, or the first item.
     */
    getDefault(resource: string|number): ng.IPromise<DdlItem> {
      return this.getDefaultMaybe(resource).then(item => {
        return item || this.get(resource).then(_.head);
      });
    }
  }

  export class SuburbService {
    private countriesPromise: ng.IPromise<Models.Country[]>;
    private countries: Models.Country[];

    private abortRequest: ng.IDeferred<{}>;
    private suburbsPromise: ng.IPromise<Models.Suburb[]>;

    // @ngInject
    constructor(private Restangular: restangular.IService,
                private $q: ng.IQService) {
    }

    getCountries() {
      if (!this.countriesPromise) {
        this.countriesPromise = this.Restangular.all("country")
          .getList({ limit: 0}).then(countries => {
            this.countries = countries;
            return countries;
          });
      }
      return this.countriesPromise;
    }

    lookup(text: string, state?: string) {
      var q: any = {
        state__abbrev: state,
        limit: 0
      };
      if (text.match(/[0-9]+/)) {
        q.postcode__startswith = text;
      } else {
        q.name__istartswith = text;
      }

      if (this.abortRequest) {
        this.abortRequest.resolve();
      }

      this.abortRequest = this.$q.defer();
      this.suburbsPromise = this.Restangular.all("suburb")
        .withHttpConfig({
          timeout: this.abortRequest.promise
        })
        .getList(q);
      return this.suburbsPromise;
    }
  }

  angular.module("kindred.crud.ddl", [])
    .service('kinDdlList', DdlListService)
    .service('kinDdl', DdlService)
    .service('kinSuburb', SuburbService);
}
