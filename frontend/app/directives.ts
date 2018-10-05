module kindred {
  'use strict';

  // @ngInject
  function appVersionDirective(appConfig: AppConfig): ng.IDirective {
    return function(scope, elm, attrs) {
      elm.text(appConfig.version);
    };
  }


  // @ngInject
  function kinAddressDirective() {
    // splits a single textarea into 4 fields
    return {
      restrict: 'A',
      scope: true,
      link: function(scope, elm, attrs) {
        var contact;

        var set_addr = function(addr: string[]) {
          elm.val(_(addr).filter(_.identity).join('\n'));
        };

        // view -> model
        elm.on('change', function() {
          if (contact) {
            var lines: string[] = angular.element(this).val().split('\n');
            var addr = _(lines).filter(_.identity).slice(0, 4).value();
            scope.$apply(function() {
              contact.address_line1 = addr[0] || '';
              contact.address_line2 = addr[1] || '';
              contact.address_line3 = addr[2] || '';
              contact.address_line4 = addr[3] || '';
            });
            set_addr(addr);
          }
        });

        var updateText = function() {
          var addr = [contact.address_line1,
                      contact.address_line2,
                      contact.address_line3,
                      contact.address_line4];
          set_addr(addr);
        };

        // model -> view
        scope.$watch(attrs.kinAddress, function(value) {
          contact = value;
          updateText();
        });
      }
    };
  }

  class DeleteButtonCtrl {
    item: any;
    special: string;
    $router: any;
    next: any[];

    private prompt = {
      title: "Confirm delete",
      msg: "Are you sure you would like to delete this record?",
      action: "Delete"
    };

    // @ngInject
    constructor(private kinFlash: FlashService,
                private kinConfirm: ConfirmService,
                private kinStudies: StudiesService,
                private $rootRouter: any) {
    }

    askConfirm() {
      if (this.item) {
        this.present().then(params => this.remove(params));
      }
    }

    private present(): ng.IPromise<{}> {
      var ctrl = undefined, template = undefined;

      if (this.special === "person") {
        template = "delete-confirm-person";
        ctrl = ['$scope', $scope => {
          $scope.item = this.item;
          this.item.getEvents().then(events => {
            $scope.events = _.each(events, event => {
              event.study = this.kinStudies.getByUri(event.study);
            });
          });
        }];
      } else if (this.special === "event") {
        template = "delete-confirm-event";
        ctrl = ['$scope', $scope => {
          this.item.getSamples().then(samples => {
            $scope.samples = samples;
          });
        }];
      }

      return this.kinConfirm.ask(this.prompt, template, ctrl);
    }

    private remove(params?: {}) {
      this.item.remove(params).then(() => this.success());
    }

    private success() {
      this.kinFlash.flash("Record deleted."); // fixme: use name from item
      var redirectTo = this.next || ['List'];
      if (this.$router) {
        try {
          this.$router.navigate(['List'])
        } catch (e) {
          this.$rootRouter.navigate(['/App']);
        }
      } else {
        this.$rootRouter.navigate(['/App']);
      }
    }
  }

  // @ngInject
  function kinDeleteButtonDirective() {
    return {
      restrict: 'A',
      bindToController: {
        item: '<kinDeleteButton',
        special: '@kinDeleteButtonSpecial',
        next: '<',
        $router: '<'
      },
      controller: DeleteButtonCtrl,
      controllerAs: 'kinDeleteButton',
      link: function(scope, elem, attrs, ctrl: DeleteButtonCtrl) {
        elem.on("click", ev => {
          scope.$apply(() => ctrl.askConfirm());
          ev.stopPropagation();
        });
      }
    };
  }

  angular.module('kindred.directives', ['kindred.services', 'ui.bootstrap'])
    .directive('appVersion', appVersionDirective)
    .directive('kinAddress', kinAddressDirective)
    .directive('kinDeleteButton', kinDeleteButtonDirective);
}
