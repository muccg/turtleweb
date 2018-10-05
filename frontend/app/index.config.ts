module kindred {
  'use strict';

  export interface AppConfig {
    version: string;
    production: boolean;
    jwt_auth_token: string;
    csrf_header_name: string;
    csrf_cookie_name: string;
    session_cookie_name: string;
    session_ping_interval: number;
    session_idle_timeout: number;
    password_expiry_days: number;
    password_expiry_warning_days: number;
    user: any;
    api_base: string;
    urls: {
      [index: string]: string;
      base: string;
      static: string;
    };
    instance: AppInstance;
  }

  export interface AppInstance {
    title: string;
    code: string;
  }

  export class Config {
    // @ngInject
    constructor($logProvider: ng.ILogProvider,
                $compileProvider: ng.ICompileProvider,
                appConfig: AppConfig) {
      // Apparently this option increases performance.
      // Debug info can be enabled from the browser console with:
      //   angular.reloadWithDebugInfo();
      $compileProvider.debugInfoEnabled(!appConfig.production);

      // enable log
      $logProvider.debugEnabled(!appConfig.production);
    }
  }

  export class ConfigHttp {
    // @ngInject
    constructor($httpProvider: ng.IHttpProvider, appConfig: AppConfig) {
      $httpProvider.defaults.xsrfHeaderName = appConfig.csrf_header_name;
      $httpProvider.defaults.xsrfCookieName = appConfig.csrf_cookie_name;
      // Help out Django's HttpRequest.is_ajax()
      $httpProvider.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
    }
  }

  // @ngInject
  export function setupUISelectConfig(uiSelectConfig) {
    uiSelectConfig.theme = 'bootstrap';
    uiSelectConfig.resetSearchInput = true;
  }
}
