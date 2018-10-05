module kindred {
  'use strict';

  export interface IdLookupResult {
    id: string;
    study: string;
    resource: string;
  }

  export class IdLookupService {
    private lookupUrl: string;

    // @ngInject
    constructor(private $http: ng.IHttpService, appConfig: AppConfig) {
      this.lookupUrl = appConfig.urls["id_lookup"];
    }

    lookup(id: string): angular.IPromise<IdLookupResult> {
      return this.$http.get(this.lookupUrl + id)
        .then(function(r) {
          return r.data;
        });
    }
  }

  angular.module("kindred.search.idlookup", [])
    .service("kinIdLookup", IdLookupService);
}
