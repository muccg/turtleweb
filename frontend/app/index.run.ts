module kindred {
  'use strict';

  export class RunBlock {
    // @ngInject
    constructor($log: ng.ILogService) {
      $log.debug('Welcome to turtleweb');
    }
  }

  export interface RootScope extends angular.IScope {
    config: AppConfig;

    // info about logged in user
    usersession: SessionService;
    user: Models.User;

    // app is navigated by studies
    study: Models.Study;
    studies: Models.Study[];

    // prepared data used when navigating to an object creation view
    _prefill_data: any;
  }

  export class RunBlockRootScope {
    // @ngInject
    constructor($rootScope: RootScope, appConfig: AppConfig) {
      $rootScope.config = appConfig;
    }
  }

  export class RunBlockLoadingTimeout {
    // @ngInject
    constructor(appLoadingTimeout) {
      appLoadingTimeout.clear();
    }
  }

  export class RunBlockServiceDebug {
    // @ngInject
    constructor($window: ng.IWindowService, appConfig: AppConfig) {
      // add in a helper function so services can be accessed from
      // browser debug console.
      if (!appConfig.production) {
        $window["getSvc"] = (name: string) => {
          return angular.element("html").injector().get(name);
        };
      }
    }
  }

  export class RunBlockErrorHandler {
    /** flag to prevent recursive exception loops */
    private handling: boolean;

    // @ngInject
    constructor($window: ng.IWindowService,
                kinError: ErrorService) {
      // Global error event handler. Usually angular will catch
      // exceptions from its digest loop before they reach here...
      // See $exceptionHandler service.
      window.onerror = (message, source, lineno, colno, error) => {
        if (!this.handling) {
          this.handling = true;
          try {
            kinError.handle({
              type: "exception",
              data: _.assign({
                message: message,
                source: source,
                lineno: lineno,
                colno: colno
              }, _.pick(error, ["name", "stack"]))
            });
          } finally {
            this.handling = false;
          }
        }
      };
    }
  }

}
