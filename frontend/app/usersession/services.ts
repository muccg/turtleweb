module kindred {
  'use strict';

  export class IdleTimeService {
    private last: number;
    private enabled: boolean;

    // @ngInject
    constructor($document: ng.IDocumentService) {
      this.last = null;
      this.enabled = true;

      var reset = (ev) => {
        if (this.enabled) {
          this.last = this.now();
        }
      };

      // fixme: check that these events suffice for tablets, phones, etc.
      $document
        .click(reset)
        .mousemove(reset)
        .keypress(reset);
    }

    private now() {
      return (new Date).getTime();
    }

    getLastMs() {
      return this.last;
    }
    getIdleSeconds() {
      return this.last ? Math.floor((this.now() - this.last) / 1000) : 0;
    }
    setIdleSeconds(idle) {
      this.last = this.now() - idle * 1000;
    }
    enable(e: boolean) {
      if (!this.enabled && e) {
        this.last = this.now();
      }
      this.enabled = !!e;
    }
  }

  function sessionUrlFactory(appConfig: AppConfig) {
    var base = appConfig.api_base + 'usersession/';
    return function sessionUrl(resource) {
      return base + (resource ? resource + '/' : '');
    };
  }

  interface PingResult {
    idle: number;
    token: string;
  }

  export class PingerService {
    private timer;
    numPings: number;
    connectionLost: boolean; // pings fail
    unauthorized: boolean; // pings fail due to 401 unauthorized
    graceTime: number;
    intervalMs: number;
    idleTimeout: number;
    timeRemaining: number;
    pingUrl: string;
    jwtAuthToken: string;

    // @ngInject
    constructor(appConfig: AppConfig, kinSessionUrl,
                private kinIdleTime: IdleTimeService,
                private $http: ng.IHttpService,
                private $interval: ng.IIntervalService) {
      this.timer = null;
      this.pingUrl = kinSessionUrl('ping');
      this.numPings = 0;
      this.graceTime = Math.round(appConfig.session_idle_timeout * 0.1);
      this.intervalMs = appConfig.session_ping_interval * 1000;
      this.idleTimeout = appConfig.session_idle_timeout;
      this.timeRemaining = this.idleTimeout;

      if (appConfig.user) {
        this.start();
      }
    }

    start() {
      this.connectionLost = this.unauthorized = false;
      this.updateTimeRemaining();
      this.numPings = 0;
      if (this.intervalMs) {
        this.timer = this.$interval(() => this.ping(), this.intervalMs);
      }
    }

    stop() {
      if (this.timer) {
        this.$interval.cancel(this.timer);
      }
    }

    public ping() {
      var idle = this.kinIdleTime.getIdleSeconds();
      this.$http.put(this.pingUrl, { idle: idle })
        .success((r: PingResult) => {
          this.updateTimeRemaining(r.idle);
          this.connectionLost = false;
          this.unauthorized = false;
          this.jwtAuthToken = r.token;
        })
        .error((data, status) => {
          this.connectionLost = true;
          this.unauthorized = (status === 401);
          if (this.unauthorized) {
            // If ping view returns 401 Unauthorized, it means the
            // session idle timer has expired.
            this.stop();
          }
        })
        .finally(() => {
          // when close to grace period, start updating idle figure
          // every second
          this.fastUpdates(!this.connectionLost &&
                           this.timeRemaining < this.graceTime * 2);
          this.numPings++;
        });
    }

    updateTimeRemaining(idle?: number) {
      if (this.idleTimeout > 0) {
        if (_.isNumber(idle)) {
          this.kinIdleTime.setIdleSeconds(idle);
        }
        this.timeRemaining = this.idleTimeout -
          this.kinIdleTime.getIdleSeconds();

        if (this.timeRemaining < 0) {
          // Session will have expired by now.
          // Immediately update the UI; don't need to wait for the
          // next ping to confirm it.
          this.connectionLost = this.unauthorized = true;
        }
      } else {
        this.timeRemaining = 0;
      }
      return this.timeRemaining;
    }

    private fastUpdatesTimer = null;
    private fastUpdates(fast: boolean) {
      if (fast) {
        if (!this.fastUpdatesTimer) {
          this.fastUpdatesTimer =
            this.$interval(() => this.updateTimeRemaining(), 1000);
        }
      } else {
        if (this.fastUpdatesTimer) {
          this.$interval.cancel(this.fastUpdatesTimer);
        }
        this.fastUpdatesTimer = null;
      }
    }
  }

  export class UserPermsService {
    authGroups = [
      "Administrator",
      "User Manager",
      "Data Analyst",
      "Curator",
      "User"
    ];

    private getPerms = user => {
      var groups = _.map(user.groups, "name");

      var editGroups = _.take(this.authGroups, 4);
      var fieldEditGroups = _.take(this.authGroups, 3);
      var userEditGroups = _.take(this.authGroups, 2);
      var adminGroups = _.take(this.authGroups, 1);

      var anyGroup = ref => _.intersection(groups, ref).length > 0;
      var superUser = has => has || user.is_superuser;

      return <Models.UserPerms>_.mapValues({
        djangoAdmin: anyGroup(fieldEditGroups),
        patientEdit: anyGroup(editGroups),
        userEdit: anyGroup(userEditGroups),
        fieldEdit: anyGroup(fieldEditGroups),
        siteAdmin: anyGroup(adminGroups)
      }, superUser);
    }

    private user: Models.User;
    djangoAdmin: boolean;
    patientEdit: boolean;
    userEdit: boolean;
    fieldEdit: boolean;
    siteAdmin: boolean;

    setUser(user) {
      this.user = user;
      _.assign(this, this.getPerms(user));
      user.perms = this;
    }

    getUserLevel(user) {
      if (user.is_active) {
        if (user.is_superuser) {
          return this.authGroups[0];
        } else {
          var groups = _.map(user.groups, "name");
          return _.intersection(this.authGroups, groups)[0];
        }
      } else {
        return "Inactive";
      }
    }
    getAuthLevels() {
      return _.map(this.authGroups, (name, i) => {
        return {
          level: i,
          name: name
        };
      });
    }
  }

  export class LoginMsgService {
    passwordExpiryDays: number;
    passwordWarningDays: number;

    // @ngInject
    constructor(appConfig: AppConfig, private kinFlash: FlashService, private $timeout) {
      this.passwordExpiryDays = appConfig.password_expiry_days;
      this.passwordWarningDays = appConfig.password_expiry_warning_days;
    }
    showMsgs(user: Models.User) {
      var msgs = [this.checkPasswordExpired(user)];
      _.each(msgs, (msg, i) => {
        if (msg) {
          this.$timeout(() => {
            this.kinFlash.flash(msg);
          }, (2 + i) * 1000);
        }
      });
    }
    private checkPasswordExpired(user: Models.User): string {
      if (user.password_change_date &&
          this.passwordExpiryDays > 0 &&
          this.passwordWarningDays > 0) {
        var passwordChangeDate = moment(user.password_change_date);
        var expiry = passwordChangeDate.clone().add(this.passwordExpiryDays, "days");
        var warn = expiry.clone().subtract(this.passwordWarningDays, "days");
        if (moment().isAfter(warn)) {
          return "Your password will expire " + expiry.fromNow() +
            ". Please change it soon.";
        } else {
          return "";
        }
      }
    }
  }

  export interface SessionServiceUi {
    checking: boolean;
    token_wait: boolean;
    error_msg: string;
  };

  export interface SessionServiceCreds {
    email: string;
    password: string;
    token?: string;
  }

  export class SessionService {
    user: Models.User;
    jwtAuthToken: string;
    ui: SessionServiceUi;

    // @ngInject
    constructor(private appConfig: AppConfig,
                private kinSessionUrl,
                private $http: ng.IHttpService,
                private $rootScope: RootScope,
                private $cookies: ng.cookies.ICookiesService,
                private kinPinger: PingerService, private kinUserPerms,
                private Restangular: restangular.IService,
                private kinLoginMsg: LoginMsgService) {
      this.ui = { checking: false, token_wait: false, error_msg: null };
      this.setUser(appConfig.user, appConfig.jwt_auth_token);
      this.setupLogout();
      this.setupTokenUpdate();
      $rootScope.usersession = this;
    }

    private setUser(user, jwtAuthToken?: string) {
      this.user = this.makeUser(user);
      this.kinUserPerms.setUser(this.user);
      this.$rootScope.user = this.user;
      this.jwtAuthToken = user ? jwtAuthToken : null;
    };

    private makeUser(user) {
      if (user) {
        user = this.Restangular.restangularizeElement(null, user, "user", false);
        user.fromServer = true;
        user.loggedIn = true;
      } else {
        user = {
          loggedIn: false
        };
      }
      return user;
    }

    private broadcast(idle=false) {
      this.$rootScope.$broadcast("usersessionChange", this.user, idle);
    };

    private setupLogout() {
      var isUnauthorized = () => this.kinPinger.unauthorized;
      this.$rootScope.$watch(isUnauthorized, unauthorized => {
        if (unauthorized) {
          this.setUser(null);
          this.broadcast(true);
        }
      });
    }

    private setupTokenUpdate() {
      this.$rootScope.$watch(() => this.kinPinger.jwtAuthToken, token => {
        if (token) {
          this.jwtAuthToken = token;
        }
      });
    }

    private eatStaleCookie() {
      // because this is a single page app, if session expires, the
      // server won't be able to clear the frontend session cookie
      // before the login request is made.
      this.$cookies.remove(this.appConfig.session_cookie_name);
    }

    private loginRequest(creds: SessionServiceCreds) {
      return this.$http.post(this.kinSessionUrl('login'), angular.copy(creds));
    }

    private logoutRequest() {
      return this.$http.get(this.kinSessionUrl('logout'));
    }

    login(creds: SessionServiceCreds) {
      this.ui.checking = true;
      this.ui.error_msg = null;
      this.eatStaleCookie();
      return this.loginRequest(creds)
        .success((res: Models.LoginResult) => {
            this.ui.token_wait = false;
            return this.$http.get(this.kinSessionUrl())
              .success((data: any) => {
                this.setUser(data.objects[0], res.token);
                this.broadcast();
                this.kinPinger.start();
                this.showLoginMsgs();
              })
              .finally(() => {
                this.ui.checking = false;
              });
          })
          .error((data, status, headers, config) => {
            this.setUser(null);
            this.ui.checking = false;
            this.ui.token_wait = (data && data.reason === 'token');
            if (!this.ui.token_wait) {
              this.ui.error_msg = 'error';
            }
          });
    }
    logout() {
      this.logoutRequest()
        .success(() => {
          this.setUser(false);
          this.broadcast();
        });
      this.kinPinger.stop();
    }

    private showLoginMsgs() {
      this.kinLoginMsg.showMsgs(this.user);
    }
  }

  function sessionFlasher($rootScope: RootScope, kinFlash: FlashService) {
    $rootScope.$on("usersessionChange", (event, user, idle) => {
      if (idle) {
        kinFlash.flash("Your session was logged out due to inactivity.");
      }
    });
  }

  class SessionModal {
    protected modal: any;

    // @ngInject
    constructor(protected kinSession: SessionService,
                protected kinPinger: PingerService,
                protected kinIdleTime: IdleTimeService,
                protected $uibModal,
                kinPartial: PartialService) {
      kinPartial.preload(this.templateUrl());
    }

    protected templateUrl() {
      return "";
    }

    private create() {
      var modal = this.$uibModal.open({
        templateUrl: this.templateUrl(),
        size: 'sm',
        backdrop: 'static',
        controller: ["$scope", $scope => {
          $scope.pinger = this.kinPinger;
        }]
      });
      modal.result.then(() => this.resolve(), () => this.reject());
      return modal;
    }

    toggle(open: boolean) {
      if (open) {
        if (!this.modal) {
          this.modal = this.create();
          this.modal.result.finally(() => {
            this.modal = null;
            this.update(false);
          });
        }
      } else {
        if (this.modal) {
          this.modal.dismiss();
        }
        this.modal = null;
      }
      this.update(open);
      return this.modal;
    }

    resolve() {}
    reject() {}
    update(open: boolean) {}
  }

  class ConnectionLostModal extends SessionModal {
    protected templateUrl() {
      return 'app/usersession/connection-lost.html';
    }
  }

  class IdleTimeoutModal extends SessionModal {
    protected templateUrl() {
      return 'app/usersession/idle-timeout.html';
    }
    resolve() {
      this.kinSession.logout();
    }
    reject() {
      this.kinIdleTime.enable(true);
      this.kinPinger.ping();
    }
    update(open: boolean) {
      // don't reset idle time once idle modal appears
      this.kinIdleTime.enable(!open);
    }
  }

  export class SessionModalsService {
    private modals: {
      connectionLost: SessionModal;
      idle: SessionModal;
    };

    // @ngInject
    constructor(kinSession, kinPinger, kinIdleTime, $uibModal, kinPartial: PartialService) {
      var modalCls = {
        connectionLost: ConnectionLostModal,
        idle: IdleTimeoutModal
      };
      var create = cls => new cls(kinSession, kinPinger, kinIdleTime, $uibModal, kinPartial);
      this.modals = <any>_.mapValues(modalCls, create);
    }

    private toggle(name, show) {
      return this.modals[name].toggle(show);
    }

    idle(show) {
      return this.toggle("idle", show);
    }

    connectionLost(show) {
      return this.toggle("connectionLost", show);
    }
  }

  export type UserPrefs = any;
  export class UserPrefsService {
    userprefs: UserPrefs;
    promise: angular.IPromise<UserPrefs>;
    savePromise: angular.IPromise<UserPrefs>;

    private resource = "userprefs";

    // @ngInject
    constructor(private Restangular: restangular.IService, private kinSession) {
    }

    // returns a promise to the whole prefs object
    get(): angular.IPromise<UserPrefs> {
      if (!this.promise) {
        this.promise = this.Restangular.all(this.resource)
          .getList({user: this.kinSession.user.id})
          .then(userprefs => this.loadPrefs(userprefs));
      }

      return this.promise;
    }

    private loadPrefs(userprefs: Models.UserPrefs[]) {
      if (userprefs.length === 0) {
        var init = { prefs: {} };
        this.userprefs = this.Restangular.restangularizeElement(null, init, this.resource, false);
      } else {
        this.userprefs = userprefs[0];
      }
      this.userprefs.prefs = this.userprefs.prefs || {};
      return this.userprefs.prefs;
    }

    // returns a promise to a single value from prefs
    getKey(key): angular.IPromise<any> {
      return this.get().then(prefs => {
        return prefs ? prefs[key] : undefined;
      });
    }

    // saves prefs to server
    save(): angular.IPromise<UserPrefs> {
      if (this.promise) {
        this.promise = this.promise.then(() => {
          return this.userprefs.save().then(prefs => this.loadPrefs([prefs]));
        });
      }
      return this.promise;
    }

    // sets a pref then saves all prefs to server
    update(key, value): angular.IPromise<UserPrefs> {
      return this.get().then((prefs) => {
        prefs[key] = value;
        return this.save();
      });
    }
  }

  export class LoginActionsService {
    private post: (url, params) => ng.IHttpPromise<any>;

    constructor($http: ng.IHttpService, appConfig: AppConfig) {
      this.post = (url, params) => {
        return $http({
          method: "POST",
          url: appConfig.urls[url],
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          data: $.param(params)
        });
      };
    }

    requestPasswordReset(email) {
      return this.post("password_reset", { email: email });
    }

    mailUserAdmins(email, msg) {
      return this.post("mail_user_admins", { email: email, msg: msg });
    }
  }

    export class LoginRememberService {
      private s: {
        email: string;
        rememberEmail: boolean;
      };
      rememberEmail: boolean;

      // @ngInject
      constructor($localStorage) {
        this.s = this.init($localStorage.$default({ loginRemember: {} }).loginRemember);
        this.rememberEmail = this.s.rememberEmail;
      }

      private init(storage) {
        storage.rememberEmail = angular.isDefined(storage.rememberEmail) ? storage.rememberEmail : true;
        storage.email = storage.email || "";
        return storage;
      }

      getCreds(): SessionServiceCreds {
        return this.s.email ? { email: this.s.email, password: "" } : { email: "", password: "" };
      }

      setCreds(creds: SessionServiceCreds) {
        this.s.email = this.rememberEmail ? creds.email : "";
        this.s.rememberEmail = this.rememberEmail;
      }
    }

  var m = angular.module("kindred.usersession.services", [])
    .service('kinIdleTime', IdleTimeService)
    .service('kinPinger', PingerService)
    .service('kinSession', SessionService)
    .service('kinLoginMsg', LoginMsgService)
    .service("kinUserPerms", UserPermsService)
    .service('kinSessionModals', SessionModalsService)
    .service("kinUserPrefs", UserPrefsService)
    .service("kinLoginActions", LoginActionsService)
    .service("kinLoginRemember", LoginRememberService)
    .factory('kinSessionUrl', sessionUrlFactory)
    .run(sessionFlasher);
}
