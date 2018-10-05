module kindred {
  'use strict';

  // @ngInject
  function confirmPasswordDirective($parse: ng.IParseService): ng.IDirective {
    return {
      restrict: 'A',
      require: "ngModel",
      link: function(scope, elm, attrs, ngModel: ng.INgModelController) {
        ngModel.$validators["matches"] = function(modelValue, viewValue) {
          var password = modelValue || viewValue;
          var reference = $parse(attrs["kinConfirmPassword"])(scope.$parent);
          return reference && password === reference;
        };
      }
    };
  }

  // @ngInject
  function validateStrengthDirective(kinPasswordStrength: PasswordStrengthService): ng.IDirective {
    return {
      restrict: 'A',
      require: "ngModel",
      link: function(scope, elm, attrs, ngModel: ng.INgModelController) {
        ngModel.$validators["weak"] = function(modelValue, viewValue) {
          var password = modelValue || viewValue;
          return password ? kinPasswordStrength.isDecent(password) : true;
        };
      }
    };
  }

  interface UsernameScope extends ng.IScope {
    user?: Models.User;
    resourceUri?: string;
    usernameShort: string;
  }

  function usernameDirective(): ng.IDirective {
    return {
      restrict: "E",
      scope: {
        resourceUri: "@"
      },
      require: "ngModel",
      template: '<a ng-link="[\'/App/Admin/User/Detail\', { id: user.id }]" data-email="{{ user.email }}" data-name="{{ user|personFullName }}">{{ usernameShort }}</a>',
      link: function(scope: UsernameScope, elem, attrs, ngModel: ng.INgModelController) {
        var getContent = function() {
          var el = angular.element(this);
          var attrs:any = _.reduce(["email", "name"], function(r, attr) {
            r[attr] = el.attr("data-" + attr);
            return r;
          }, {});

          return attrs.name + "<br/>" + attrs.email;
        };

        var link = elem.find("a").popover({
          content: getContent,
          html: true,
          container: "body",
          placement: "auto top",
          trigger: "hover"
        });

        ngModel.$render = function() {
          scope.user = ngModel.$viewValue;
          // fixme: maybe use a short username@host version
          scope.usernameShort = scope.user.email;
        };

        elem.on("$destroy", function(event) {
          link.popover("destroy");
        });
      }
    };
  }

  var m = angular.module("kindred.user.directives", [])
    .directive("kinConfirmPassword", confirmPasswordDirective)
    .directive("kinValidateStrength", validateStrengthDirective)
    .directive("kinUsername", usernameDirective);
}
