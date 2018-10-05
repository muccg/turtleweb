module kindred {
  'use strict';

  export interface FlashMessage {
    text: string;
    transient: boolean;
    type: string;
  }

  export class FlashService {
    public messages: FlashMessage[];

    constructor() {
      this.messages = [];
    }

    flash(message: string, type?: string, transient?: boolean): void {
      this.messages.push({ text: message, transient: transient, type: type || "info" });
    }

    consume(): FlashMessage {
      return this.messages.pop();
    }

    clear(): void {
      this.messages.length = 0;
    }
  }

  interface FlashMessagesScope extends ng.IScope {
    timeout: number;
    messages: FlashMessage[];
    flash: FlashService;
    hideMessage: any;
    pause: any
    unpause: any;
  }

  // @ngInject
  function flashMessagesDirective(kinFlash: FlashService,
                                  $timeout: ng.ITimeoutService,
                                  $animate: ng.animate.IAnimateService): ng.IDirective {
    return {
      restrict: 'E',
      templateUrl: 'app/components/flash-messages/flash-messages.html',
      scope: {
        timeout: '=?'
      },
      link: function(scope: FlashMessagesScope, elem, attrs) {
        if (!scope.timeout) {
          scope.timeout = 10 * 1000;
        }
        var timer;

        var takeOne = function() {
          kinFlash.consume();
          var msg = scope.messages.pop();
          timer = null;
          makeTimer(msg);
        };

        var makeTimer = function(msg) {
          if (timer) {
            $timeout.cancel(timer);
          }
          if (scope.messages.length > 0) {
            var timeout = scope.timeout * (msg.transient ? 0.33 : 1.0);
            timer = $timeout(takeOne, timeout);
          } else {
            timer = null;
          }
        };

        scope.flash = kinFlash;
        scope.messages = [];

        scope.$watch("flash.messages.length", (len: number) => {
          if (len) {
            var msg = kinFlash.messages[len - 1];
            if (scope.messages.length < 10) {
              scope.messages.push(msg);
              makeTimer(msg);
            }
          }
        });

        scope.hideMessage = function(msg, index) {
          scope.messages.splice(index, 1);
          kinFlash.consume();
          makeTimer(msg);
        };

        scope.pause = function(msg) {
          if (timer && !(msg && msg.transient)) {
            $timeout.cancel(timer);
            timer = null;
          }
        };

        scope.unpause = function(msg) {
          if (!msg.transient) {
            makeTimer(msg);
          }
        };

        scope.$on("$destroy", function() {
          scope.pause();
        });
      }
    };
  }

  interface LastMessageScope extends ng.IScope {
    msg?: FlashMessage;
  }

  // @ngInject
  function flashLastMessageDirective(kinFlash: FlashService) : ng.IDirective {
    return {
      restrict: 'A',
      link: function(scope: LastMessageScope, elem, attrs) {
        scope.$watch(() => kinFlash.messages.length, len => {
          scope.msg = len ? kinFlash.messages[len - 1] : null;
        });
        scope.$on("$destroy", () => {
          var msg = kinFlash.consume();
          if (msg) {
            // if message is already showm, make it disappear
            msg.type = "";
          }
        });
      }
    };
  }

  var m = angular.module("kindred.components.flash", [])
    .service("kinFlash", FlashService)
    .directive('kinFlashMessages', flashMessagesDirective)
    .directive('kinFlashLastMessage', flashLastMessageDirective);
}
