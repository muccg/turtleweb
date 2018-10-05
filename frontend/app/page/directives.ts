module kindred {
  'use strict';

  class NavbarDirectiveCtrl {
    collapse: boolean;
    urls: {};
    user: Models.User;

    // @ngInject
    constructor($scope: ng.IScope, appConfig: AppConfig, public kinSession: SessionService, public kinStudies: StudiesService) {
      this.close();
      this.urls = appConfig.urls;
      $scope.$watch(() => kinSession.user, user => { this.user = user; });
    }
    toggle() {
      this.collapse = !this.collapse;
    }
    close() {
      this.collapse = true;
    }
  }

  let navbarComponent: ng.IComponentOptions = {
    templateUrl: "app/page/navbar.html",
    controllerAs: "navbar",
    controller: NavbarDirectiveCtrl
  };

  // @ngInject
  function sidebarDirective(): ng.IDirective {
    return {
      restrict: 'E',
      templateUrl: 'app/page/sidebar.html',
      bindToController: {
        $router: "<",
        study: "<"
      },
      controller: class {
        urls: {};
        collapse: boolean;
        $router: any;
        study: Models.Study;
        studies: Models.Study[];
        perms: Models.UserPerms;
        u: RouteUtilService;

        // @ngInject
        constructor($scope: ng.IScope,
                    public kinStudies: StudiesService,
                    kinSession: SessionService,
                    kinRouteUtil: RouteUtilService,
                    public kinHelp: HelpService,
                    appConfig: AppConfig) {
          this.urls = appConfig.urls;
          this.close();

          kinStudies.get().then(studies => {
            this.studies = studies;
          });
          $scope.$watch(() => kinStudies.current, current => {
            this.study = current;
          });
          $scope.$watch(() => kinSession.user.perms, perms => {
            this.perms = perms;
          });
          this.u = kinRouteUtil;
        }

        toggle() {
          this.collapse = !this.collapse;
        }
        close() {
          this.collapse = true;
        }
      },
      controllerAs: "vm",
      link: function(scope, elem, attrs) {
      }
    };
  }

  class BreadcrumbsController {
    // directive scope bindings
    $router: any;

    // controller vars
    breadcrumbs: BreadcrumbScope[];

    // @ngInject
    constructor(private kinNavigation: NavigationService,
                private kinStudies: StudiesService,
                private $rootRouter) {
      this.breadcrumbs = [];
    }

    addBreadcrumb(breadcrumb: BreadcrumbScope) {
      this.breadcrumbs.push(breadcrumb);
      breadcrumb.$watch("hide", hide => {
        this.resolveBreadcrumb(breadcrumb);
      });
    }

    removeBreadcrumb(breadcrumb: BreadcrumbScope) {
      _.pull(this.breadcrumbs, breadcrumb);
    }

    start() {
      this.kinNavigation.setBreadcrumbs(this.resolveBreadcrumbs());
    }

    finish() {
      this.kinNavigation.setBreadcrumbs([]);
    }

    private resolveBreadcrumbs(): Breadcrumb[] {
      return <any>_.forEach(this.breadcrumbs, breadcrumb => {
        this.resolveBreadcrumb(breadcrumb);
      });
    }

    private resolveBreadcrumb(breadcrumb: BreadcrumbScope) {
      breadcrumb["href"] = breadcrumb.link && !breadcrumb.hide
        ? this.resolve(breadcrumb.link) : null;
    }

    private resolve(link: any[]): string {
      var router = this.$router || this.$rootRouter;
      try {
        var instruction = router.generate(this.patchLink(link));
        return "./" + instruction.toRootUrl();
      } catch (e) {
        console.warn("failed to resolve breadcrumb link", link, router);
        return null;
      }
    }

    private patchLink(link: any[]): any[] {
      if (link[0] === "_") {
        var prefix = ["App", 'Studies', { study: this.kinStudies.current ? this.kinStudies.current.slug : "_" }];
        return _.concat(prefix, _.tail(link));
      } else {
        return link;
      }
    }
  }

  // @ngInject
  function breadcrumbsDirective() {
    return {
      restrict: 'E',
      template: '',
      bindToController: {
        $router: '<'
      },
      controller: BreadcrumbsController,
      controllerAs: '$ctrl',
      link: function(scope: ng.IScope, elem, attrs, ctrl: BreadcrumbsController) {
        ctrl.start();
        scope.$on("$destroy", () => ctrl.finish());
      }
    };
  }

  interface BreadcrumbScope extends ng.IScope {
    title: string;
    link: any[];
    hide: boolean;
    show: boolean;
  }

  // @ngInject
  function breadcrumbDirective() {
    return {
      restrict: 'E',
      template: '',
      scope: {
        title: '@',
        link: '<?',
        hide: '<',
        show: '<'
      },
      require: '^kinBreadcrumbs',
      link: function(scope: BreadcrumbScope, elem, attrs, ctrl: BreadcrumbsController) {
        ctrl.addBreadcrumb(scope);
        scope.$on("$destroy", () => ctrl.removeBreadcrumb(scope));

        scope.$watch("show", show => {
          if (angular.isDefined(show)) {
            scope.hide = !show;
          }
        });
      }
    };
  }

  export interface Breadcrumb {
    title: string;
    href: string;
    hide?: boolean;
  }

  export let navbarBreadcrumbsComponent: ng.IComponentOptions = {
    templateUrl: "app/page/breadcrumbs.html",
    bindings: {
      navbar: '<'
    },
    controller: class {
      navbar: NavbarDirectiveCtrl;
      u: RouteUtilService;
      instance: AppInstance;
      crumbs: Breadcrumb[];
      title: string;

      // @ngInject
      constructor($scope: ng.IScope, kinRouteUtil: RouteUtilService,
                  private kinStudies: StudiesService, appConfig: AppConfig,
                  private kinNavigation: NavigationService) {
        this.u = kinRouteUtil;
        this.instance = appConfig.instance;

        $scope.$watchCollection(() => kinNavigation.getBreadcrumbs(), breadcrumbs => {
          this.crumbs = _.concat(this.initCrumbs(), breadcrumbs);
        });
      }

      private initCrumbs(): Breadcrumb[] {
        var crumbs = [];
        var crumb = (title, route: any[]) => {
          var href = route ? "./" + this.u.generate(route) : "";
          crumbs.push({ title: title, href: href });
        };

        crumb(this.instance.title, ['App', 'Home']);

        if (this.kinStudies.current) {
          var studyRoute = ['App', 'Studies', { study: this.kinStudies.current.slug }]

          crumb(this.kinStudies.current.name,
                studyRoute.concat(['StudyHome']));
        }

        return crumbs;
      }
    }
  };

  // @ngInject
  function loadingMessageDirective(kinLoading: LoadingService, kinSaving: SavingService, kinConfirm: ConfirmService) {
    return {
      restrict: 'C',
      link: function(scope, elem, attrs) {
        elem.removeClass("pre-init").addClass("post-init");

        scope.message = "Loading...";

        scope.$watch(function() {
          return {
            loading: kinLoading.loading,
            saving: kinSaving.saving,
            confirming: kinConfirm.confirming
          };
        }, function(is) {
          scope.loading = (is.loading || is.saving) && !is.confirming;
          scope.message = is.loading ? "Loading..." : is.saving ? "Saving..." : "";
        }, true);
      }
    };
  }

  // @ngInject
  function loadingAnimDirective($http: ng.IHttpService, kinLoading: LoadingService, kinSaving: SavingService) {
    return {
      restrict: 'A',
      scope: {
        force: '=?kinLoadingAnim'
      },
      link: function(scope, elem, attrs) {
        var svg;

        var setSvg = function(data) {
          if (!svg) {
            svg = angular.element(data).find('svg');
            elem.after(svg).hide();
            update();
          }
        };

        var toggleAnim = function(animating) {
          if (svg) {
            svg.attr("class", animating ? "animating" : "");
          }
        };

        var shouldAnim = function() {
          return scope.force || kinLoading.loading || kinSaving.saving;
        };

        var update = function() {
          toggleAnim(shouldAnim());
        };

        attrs.$observe("src", function(src) {
          $http({
            method: "GET",
            url: src,
            responseType: "document"
          }).then(function(response) {
            setSvg(response.data);
          });
        });

        scope.$watch(shouldAnim, update);
      }
    };
  }

  // @ngInject
  function viewActionsDirective($window: ng.IWindowService, $timeout: ng.ITimeoutService, kinHelp: HelpService): ng.IDirective {
    return {
      restrict: 'C',
      link: function(scope, elem, attrs) {
        // there are libraries to do this (e.g. Tether)
        // ... but they suck
        var win = angular.element($window);
        var ref = elem.parent().children().first();
        var halfGutter = 15; // from bootstrap variables.less
        var reposition = () => {
          // css media selectors will set fixed position on larger screens
          if (elem.css("position") === "fixed") {
            var navbar = angular.element(".navbar");
            var helpbar = angular.element(".helpbar");
            var refPos = {
              right: ref.offset().left + ref.outerWidth(),
              bottom: navbar.height() + 10
            };
            var helpbarWidth = helpbar.is(":visible") ? helpbar.outerWidth() : 0;
            var viewPortWidth = window.innerWidth - helpbarWidth;

            elem.css({
              top: refPos.bottom + "px",
              left: refPos.right + "px",
              width: viewPortWidth - refPos.right - halfGutter / 2,
              visibility: "visible"
            });
          } else {
            elem.css({
              top: "",
              left: "",
              width: "",
              visibility: ""
            });
          }
        };

        win.resize(reposition);
        $timeout(reposition, 0);
        scope.$watch(() => kinHelp.show, () => $timeout(reposition, 0));
      }
    };
  }

  /**
   * Inhibit the browser's natural behaviour to allow users to select
   * text and drag and drop images and links.
   * There is some css to go with this directive.
   * With such an application, it's rarely desirable to select the
   * text in buttons and menus, or drag them somewhere else.
   */
  // @ngInject
  function preventDndDirective(): ng.IDirective {
    return {
      restrict: "C",
      link: function(scope, elem, attrs) {
        elem.on("dragstart", () => false);
      }
    };
  }

  angular.module("kindred.page.directives", ['kindred.services'])
    .component("kinNavbar", navbarComponent)
    .directive("kinSidebar", sidebarDirective)
    .directive("kinBreadcrumb", breadcrumbDirective)
    .directive("kinBreadcrumbs", breadcrumbsDirective)
    .component("kinNavbarBreadcrumbs", navbarBreadcrumbsComponent)
    .directive("kinLoadingMessage", loadingMessageDirective)
    .directive("kinLoadingAnim", loadingAnimDirective)
    .directive("kinViewActions", viewActionsDirective)
    .directive("kinPreventDnd", preventDndDirective);
}
