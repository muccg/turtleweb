module kindred {
  'use strict';

  // common attributes of restangular elements
  interface CrudElement extends restangular.IElement {
    id: string;
    fromServer: boolean;
    _schema: Models.ApiSchema;
  }

  export interface ParsedUri {
    resource: string;
    id: string;
  };

  export class CrudService {
    private apiBase: string;

    // @ngInject
    constructor(private Restangular: restangular.IService,
                private kinSchema: SchemaService,
                private $q: ng.IQService,
                appConfig: AppConfig) {
      this.apiBase = appConfig.api_base;
    }

    saveModel(resourceName: string, orig: {}) {
      var model = <CrudElement>this.Restangular.copy(orig);
      // Open Restangular bug: https://github.com/mgonto/restangular/issues/697
      // Restangular.copy() always sets object.fromServer to true resulting in
      // save() always trying to PUT
      // TODO remove the following workaround when the bug is fixed
      if (!model.id) {
        model.fromServer = false;
      }
      return this.kinSchema.get(resourceName).then(function(schema) {
        model._schema = schema;
        return model.save();
      });
    }

    parseResourceUri(uri: string): string {
      var full = this.fullParseResourceUri(uri);
      return full ? full.id : null;
    }

    fullParseResourceUri(uri: string): ParsedUri {
      // for absolute uris, strip off the api base
      if (uri[0] === '/') {
        var base = uri.substr(0, this.apiBase.length);
        if (base !== this.apiBase) {
          console.warn('URI "' + uri + '" is not within the apiBase');
        } else {
          var start = this.apiBase.length;
          uri = uri.substr(uri[start] === '/' ? start + 1 : start);
        }
      } else {
        console.warn('URI "' + uri + '" is not an absolute url path');
      }

      var parts = uri.split("/");
      if (parts.length >= 2) {
        var id = parts.pop(), resource = parts.pop();
        return { id: id, resource: resource };
      } else {
        return null;
      }
    }
    makeResourceUri(resource: string, id: string): string {
      return this.apiBase + resource + "/" + id;
    }

    getUri(uri: string): restangular.IPromise<Models.Any> {
      return this.fullGetUri(uri).promise;
    }

    fullGetUri(uri: string): { parsed: ParsedUri; promise: restangular.IPromise<Models.Any> } {
      var parsed = uri ? this.fullParseResourceUri(uri) : null;
      var promise;
      if (parsed) {
        promise = this.Restangular.oneUrl(parsed.resource, uri).get();
      } else {
        promise = <any>new this.$q(resolve => resolve(null));
      }
      return {
        parsed: parsed,
        promise: promise
      };
    }
  }

  export class ServerLogService {
    private logResource: string;
    private version: string;

    // @ngInject
    constructor(private $http: ng.IHttpService,
                private $log: ng.ILogService, appConfig: AppConfig) {
      this.logResource = appConfig.api_base + "clientlog/";
      // maybe user hasn't refreshed browser recently
      this.version = appConfig.version;
    }

    private clientLog(level, msg, data?) {
      var mapping = {
        critical: "error",
        error: "error",
        warning: "warn",
        info: "info",
        debug: "debug"
      };
      var func = this.$log[mapping[level] || "error"];
      func(msg);
    }

    post(level: string, msg: string, data?: {}) {
      this.clientLog(level, msg, data);
      return this.$http.post(this.logResource, {
        level: level,
        msg: msg,
        data: data || {},
        version: this.version
      });
    }
  }

  export type SchemaPromise = ng.IPromise<Models.ApiSchema>;

  export class SchemaService {
    cache: ng.ICacheObject;

    // @ngInject
    constructor(private $http: ng.IHttpService,
                $cacheFactory: ng.ICacheFactoryService,
                private  appConfig: AppConfig) {
      this.cache = $cacheFactory('schemaCache');
    }

    get(resourceName: string): SchemaPromise {
      var get = k => this.cache.get<SchemaPromise>(k);
      resourceName = resourceName.replace(/\.\.\/?/g, "");
      if (!get(resourceName)) {
        var req = this.getSchema(resourceName)
          .then(function(response) {
            return _.assign(req.$object, response.data);
          });
        req.$object = {};
        this.cache.put<SchemaPromise>(resourceName, req);
      }
      return get(resourceName);
    }

    private getSchema(resourceName) {
      var uri = this.appConfig.api_base + resourceName + '/schema/';
      return this.$http.get(uri);
    }
  }

  /**
   * Minimal element type. Might be restangularized, or might not.
   */
  export interface MinElem {
    id: string;
    remove?: any;
    put?: any;
  };
  export interface DiffResult {
    create: {}[];
    remove: MinElem[];
    update: MinElem[];
  }
  export class CollectionService {
    // @ngInject
    constructor(private $q: angular.IQService, private Restangular: restangular.IService) {
    }

    isEqual(original: MinElem[], collection: MinElem[], eqFunc=angular.equals): boolean {
      var customizer = (obj, oth) => this.isItemEqual(obj, oth, eqFunc);
      return _.isEqualWith(original, collection, customizer);
    }

    isItemEqual(a: any, b: any, eqFunc): boolean {
      if (a && _.isFunction(a.plain)) {
        a = a.plain();
      }
      if (b && _.isFunction(b.plain)) {
        b = b.plain();
      }
      return eqFunc(a, b);
    }

    diff(original: MinElem[], collection: MinElem[], eqFunc=angular.equals): DiffResult {
      var original_ids = _.keyBy(original, 'id');
      var ids = _.keyBy(_.filter(collection, "id"), "id");

      return {
        // create objects which don't have ids
        create: _.reject(collection, 'id'),
        // remove objects which are in original but not collections
        remove: _(original_ids).keys().difference(_.keys(ids))
          .map(id => original_ids[id]).value(),
        // update objects which are in both original and collection, but
        // are different
        update: _(collection).filter('id')
          .filter(item => !this.isItemEqual(original_ids[item.id], item, eqFunc))
          .value()
      };
    }

    save(original, collection, eqFunc?) {
      var diff = this.diff(original, collection, eqFunc);
      // fixme: this will fire off all actions in
      // parallel... perhaps not a good idea for large collections!
      // maybe the browser will sequence requests?
      return this.$q.all(_.concat(
        _.map(diff.create, item => collection.post(item)),
        _.map(diff.update, item => item.put()),
        _.map(diff.remove, item => item.remove())
      ));
    }

    // this lets you transform a collection using e.g. lodash
    // functions, but also keep the restangular magic functions.
    mungeCollection(items, munge): restangular.ICollection {
      var munged = munge(items);
      return this.Restangular.restangularizeCollection(null, munged, items.route);
    }

    // Deep-clone and sort an items collection
    sortCloneCollection(items: {}[]): restangular.ICollection {
      var munge = items => _.sortBy(items, "order");
      return this.cloneCollection(this.mungeCollection(items, munge));
    }

    cloneCollection(items: {}[]): restangular.ICollection {
      var munge = items => _.map(items, item => this.copyItem(item));
      return this.mungeCollection(items, munge);
    }

    private copyItem(item) {
      if (item && _.isFunction(item.clone)) {
        var copy = item.clone();
        copy.fromServer = item.fromServer;
        return copy;
      } else {
        return angular.copy(item);
      }
    }
  }

  export class CheckUniqueService {
    // @ngInject
    constructor(private Restangular: restangular.IService, private $q: ng.IQService, private kinStudies: StudiesService) {
    }

    // this method is suitable for use in an $asyncValidators function
    check(item: any, uniqueFields: string, value: string): ng.IPromise<boolean> {
      var resourceName = item ? item.route : null;
      if (resourceName && uniqueFields && !angular.isUndefined(value)) {
        var fields = uniqueFields.split(/\s+/);
        var q = { limit: 1 };
        _.each(fields, field => {
          if (field === "study") {
            q[field] = this.kinStudies.current ? this.kinStudies.current.id : null;
          } else {
            q[field] = value;
          }
        });
        return this.Restangular.all(resourceName).getList(q).then(items => {
          var exists = _.reject(items, { id: item.id }).length > 0;
          return exists ? this.$q.reject('exists') : true;
        }, () => {
          // something bad happened, assume it's ok
          return true;
        });
      }
      return this.$q(resolve => resolve(true));
    }
  }

  angular.module("kindred.crud.services", [])
    .service("crud", CrudService)
    .service("kinServerLog", ServerLogService)
    .service("kinSchema", SchemaService)
    .service("kinCollection", CollectionService)
    .service("kinCheckUnique", CheckUniqueService);
}
