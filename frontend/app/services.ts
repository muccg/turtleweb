/// <reference path="../typings/tsd.d.ts" />

module kindred {
  // preFill service. send data to this service before redirecting to a
  // route which consumes from this service. this service assumes ownership
  // of the data passed to it, so don't store an object which might be mutated
  // in the future
  export class PreFillService {
    // @ngInject
    constructor(private $rootScope: RootScope) {
      $rootScope._prefill_data = null;
    }

    set(data: any): void {
      this.$rootScope._prefill_data = data;
    }

    // get the data & and clear it from the service
    // if no data, returns empty dictionary
    get(): any {
      var pf = this.$rootScope._prefill_data;
      this.$rootScope._prefill_data = null;
      return pf ? pf : {};
    }
  }

  export interface AppError {
    type: "exception" | "restangular" | "upload" | "router";
    data: any;
  };

  export class ErrorService {
    private modalTemplate: string;
    private currentModal: any;

    // @ngInject
    constructor(kinPartial: PartialService,
                private kinServerLog: ServerLogService,
                private $uibModal: ng.ui.bootstrap.IModalService) {
      this.modalTemplate = kinPartial.preload("app/dlg/error-modal.html");
    }

    handle(error: AppError): ng.IPromise<any> {
      error.data = this.processData(error.data);
      var logPromise = this.serverLog(error);
      if (error.type !== "exception") {
        return this.errorModal(error, logPromise);
      } else {
        return logPromise;
      }
    }

    /** Makes error objects serializable. */
    private processData(data) {
      var errorProps = ["message", "name", "stack",
                        "fileName", "lineNumber", "columnNumber"];
      return _.isError(data) ?
        _.pick(data, errorProps) :
        (_.isPlainObject(data) ? data : { d: data });
    }

    private serverLog(error: AppError) {
      if (error.type === "restangular") {
        var r = error.data;
        // tell the server what it already knows... but meh
        return this.kinServerLog.post("error", "Restangular error status " + r.status);
      } else {
        return this.kinServerLog.post("error", error.type, error.data);
      }
    }

    errorModal(error: AppError, logPromise?) {
      if (!this.currentModal) {
        // only show the first error message
        this.currentModal = this.$uibModal.open({
          templateUrl: this.modalTemplate,
          controller: function($scope, $timeout, $q) {
            $scope.error = error;

            $q.all([logPromise, $timeout(2000)]).then(function() {
              $scope.sent = true;
            }, function() {
              $scope.sendFailed = true;
            });
          }
        });
        this.currentModal.result.finally(() => {
          this.currentModal = null;
        });
      }
      return this.currentModal.result;
    }
  }

  // @ngInject
  function exceptionHandlerFactory($log: ng.ILogService, $injector: ng.auto.IInjectorService) {
    var handling = false;
    return function(exception, cause) {
      // breaks circular dependency with $http
      var kinError = <ErrorService>$injector.get("kinError");

      $log.error.apply($log, arguments);

      if (!handling) {
        handling = true;
        try {
          kinError.handle({
            type: "exception",
            data: exception
          });
        } finally {
          handling = false;
        }
      }
    };
  }

  export class LoadingService {
    loading: boolean;

    // @ngInject
    constructor($rootScope: RootScope, $rootRouter) {
      this.loading = false;
      $rootScope.$watch(() => $rootRouter.navigating, nav => {
        this.loading = nav;
      });
    }
  }

  export interface SavingMessageFunc<T> {
    (result: T): string;
  }

  export class SavingService {
    // @ngInject
    constructor(private kinError: ErrorService,
                private kinFlash: FlashService,
                private kinLockingModal: LockingModalService) {
      this.saving = false;
    }

    saving: boolean;

    monitor<T>(promise: angular.IPromise<T>, msg?: SavingMessageFunc<T>): angular.IPromise<T> {
      this.saving = true;
      msg = msg || (item => "The record was saved.");
      return promise.then(item => {
        this.saving = false;
        this.kinFlash.flash(msg(item), "success", true);
        return item;
      }, (response) => {
        this.saving = false;
        if (response.status === 412) {
          this.kinLockingModal.present(response.config.url);
        } else {
          this.kinFlash.flash("Could not save the record.", "danger");
          this.kinError.handle(response);
        }
      });
    }
  }

  export class PartialService {
    // @ngInject
    constructor(private $templateCache: ng.ITemplateCacheService,
                private $http: ng.IHttpService) {
    }

    // some partials need to be preloaded because once they are needed
    // it will be too late to fetch them
    preload(partial: string): string {
      this.$http.get(partial, { cache: this.$templateCache });
      return partial;
    }
  }

  angular.module('kindred.services', [
    'kindred.filters',
    'kindred.dlg',
    'kindred.config'
  ])
    .service("kinPreFill", PreFillService)
    .service('kinError', ErrorService)
    .factory('$exceptionHandler', exceptionHandlerFactory)
    .service("kinLoading", LoadingService)
    .service("kinSaving", SavingService)
    .service("kinPartial", PartialService);
}
