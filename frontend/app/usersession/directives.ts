module kindred {
  'use strict';

  export class LoginDirectiveController {
    tokenDigits = 6;
    tokenDigitsWord = "six";
    remember: LoginRememberService;
    s: SessionServiceUi;
    creds: SessionServiceCreds;
    ctrl: LoginDirectiveController;

    // @ngInject
    constructor(private kinSession: SessionService, kinLoginRemember: LoginRememberService) {
      this.ctrl = this;
      this.s = kinSession.ui;
      this.remember = kinLoginRemember;
    }

    initCreds() {
      this.creds = this.creds || this.remember.getCreds();
    }

    login() {
      this.kinSession.login(this.creds);
      this.remember.setCreds(this.creds);
      delete this.creds.token;
    }

    cancelToken() {
      this.s.token_wait = false;
      this.s.error_msg = null;
      delete this.creds.token;
      delete this.creds.password;
    }
  }

  // @ngInject
  function loginDirective(focus): ng.IDirective {
    return {
      restrict: 'E',
      scope: {
        creds: '=',
        ctrl: '='
      },
      templateUrl: 'app/usersession/login-form.html',
      controller: LoginDirectiveController,
      controllerAs: 'vm',
      bindToController: true,
      link: function(scope, elem, attrs, ctrl: LoginDirectiveController) {
        ctrl.initCreds();

        focus(ctrl.creds.email ? "loginPassword" : "loginEmail");

        elem.on('keypress', 'input[name="email"]', function(ev) {
          var password = elem.find('input[name="password"]');
          if (ev.keyCode === 13 && !password.val()) {
            password.focus();
            ev.preventDefault();
            ev.stopPropagation();
          }
        });
        elem.on('keyup', 'input[name="code"]', function(ev) {
          var code = angular.element(ev.target);
          if (ev.keyCode === 13 && !code.val() || ev.keyCode === 27) {
            ev.preventDefault();
            ev.stopPropagation();
            ctrl.cancelToken();
            focus("loginPassword");
          }
        });

        scope.$watch(() => ctrl.s, function(ui) {
          if (ui && ui.token_wait) {
            focus('enterToken');
          }
        }, true);
      }
    };
  }

  // @ngInject
  function sessionModalDirective(kinPinger: PingerService, kinSessionModals: SessionModalsService): ng.IDirective {
    return {
      restrict: 'E',
      //template: '<pre>timeRemaining = {{ timeRemaining }}\nconnectionLost = {{ connectionLost }}</pre>',
      template: '',
      link: function(scope, elem, attr) {
        var pick = function() {
          // get interesting values from pinger
          var interesting = ["timeRemaining", "numPings",
                             "connectionLost", "unauthorized"];
          return _.pick(kinPinger, interesting);
        };

        scope.$watch(pick, function(a: any) {
          var showIdle = !a.connectionLost && !a.unauthorized &&
            a.timeRemaining < kinPinger.graceTime;
          var showConnectionLost = a.connectionLost && !a.unauthorized;

          // show/hide modals
          kinSessionModals.idle(showIdle);
          kinSessionModals.connectionLost(showConnectionLost);

          _.assign(scope, a);
        }, true);
      }
    };
  }


  // @ngInject
  function passwordResetDirective($uibModal, kinLoginActions: LoginActionsService): ng.IDirective {
    return {
      restrict: "A",
      scope: {
        email: "=?kinPasswordReset"
      },
      link: function(scope, elem, attrs) {
        elem.click(function() {
          $uibModal.open({
            templateUrl: "app/usersession/password-reset.html",
            scope: scope
          }).result.then(function(email) {
            return kinLoginActions.requestPasswordReset(email);
          }).then(function() {
            return $uibModal.open({
              templateUrl: "app/usersession/password-reset-2.html",
              scope: scope
            }).result;
          });
        });
      }
    };
  }

  // @ngInject
  function mailUserAdminsDirective($uibModal, kinLoginActions: LoginActionsService): ng.IDirective {
    return {
      restrict: "A",
      scope: {
        email: "=?kinMailUserAdmins"
      },
      link: function(scope, elem, attrs) {
        elem.click(function() {
          $uibModal.open({
            templateUrl: "app/usersession/mail-user-admins.html",
            controller: function($scope) {
              $scope.mail = {
                from: $scope.email,
                msg: ""
              };
            },
            scope: scope
          }).result.then(function(mail) {
            return kinLoginActions.mailUserAdmins(mail.from, mail.msg);
          }).then(function(result) {
            return $uibModal.open({
              templateUrl: "app/usersession/mail-user-admins-done.html",
              scope: scope
            }).result;
          });
        });
      }
    };
  }

  // @ngInject
  function idleTimeDirective(kinIdleTime: IdleTimeService): ng.IDirective {
    return {
      restrict: 'A',
      link: function(scope, elem, attrs) {
        scope.$watch(kinIdleTime.getIdleSeconds, function(idle) {
          elem.text(_.isNumber(idle) ? idle : "");
        });
      }
    };
  }


  // @ngInject
  function tokenCodeDirective(): ng.IDirective {
    return {
      restrict: 'A',
      require: '^ngModel',
      scope: {
        numDigits: '=kinTokenCode'
      },
      link: function(scope, elem, attrs, ngModel: ng.INgModelController) {
        var pad0 = function(numDigits, n) {
          return ("000000000000000000000" + n).slice(-numDigits);
        };
        ngModel.$parsers.push(function(num) {
          return num ? pad0(scope.numDigits, num) : null;
        });
        ngModel.$formatters.push(function(str) {
          return str ? parseInt(str, 10) : null;
        });
      }
    };
  }


  angular.module("kindred.usersession.directives", [])
    .directive('kinLogin', loginDirective)
    .directive('kinSessionModal', sessionModalDirective)
    .directive("kinPasswordReset", passwordResetDirective)
    .directive("kinMailUserAdmins", mailUserAdminsDirective)
    .directive('kinIdleTime', idleTimeDirective)
    .directive('kinTokenCode', tokenCodeDirective);
}
