module kindred {
  'use strict';

  export let AppView: ng.IComponentOptions = {
    template: "<ng-outlet></ng-outlet>",
    $routeConfig: [
      {path: "/login", name: "Login", component: "kinLoginView"},
      {path: "/...", name: "App", component: "kinTopLevelView", useAsDefault: true}
    ]
  };

  export let TopLevelView: ng.IComponentOptions = {
    templateUrl: "app/top-level.html",
    $routeConfig: [
      {path: "/manage/...", name: "Admin", component: "kinAdminView"},
      {path: "/biobank/...", name: "Biobank", component: "kinBiobankView"},
      {path: "/settings", name: "Settings", redirectTo: ["Home"]},
      {path: "/go/:id", name: "Go", component: "kinGoView"},
      {path: "/test/...", name: "Test", component: "kinTestView"},
      {path: "/:study/...", name: "Studies", component: "kinStudiesView"},
      {path: "/", name: "Home", component: "kinHomeView", useAsDefault: true}
    ],
    // @ngInject
    $canActivate: <any>function($nextInstruction, $prevInstruction, kinLoginRedirect: LoginRedirectService) {
      return kinLoginRedirect.checkLogin($nextInstruction);
    },
    bindings: { $router: "<" },
    controllerAs: 'vm',
    controller: class {
      $router: any;
      // @ngInject
      constructor(public kinHelp: HelpService) {
      }
    }
  };

  export let HomeView: ng.IComponentOptions = {
    templateUrl: "app/home-study-list.html",
    controller: "HomeCtrl"
  };

  export let LoginView: ng.IComponentOptions = {
    templateUrl: "app/usersession/login.html",
    // @ngInject
    $canActivate: <any>function($nextInstruction, $prevInstruction, kinLoginRedirect: LoginRedirectService) {
      return kinLoginRedirect.avoidLoginPage($nextInstruction);
    }
  };

  export let StudiesView: ng.IComponentOptions = {
    template: "<ng-outlet></ng-outlet>",
    $routeConfig: [
      {path: "/", name: "StudyHome", component: "kinStudyHomeView", useAsDefault: true},
      {path: "/patient/...", name: "Person", component: "kinPersonView"},
      {path: "/event/...", name: "Event", component: "kinEventView"},
      {path: "/sample/...", name: "Biobank", component: "kinBiobankView"},
      {path: "/studygroup/...", name: "StudyGroup", component: "kinStudyGroupView"},
      {path: "/report/...", name: "Report", component: "kinReportView"},
      {path: "/search/...", name: "SavedSearch", component: "kinSavedSearchView"},
      {path: "/**", redirectTo: ["StudyHome"]}
    ],
    // @ngInject
    $canActivate: <any>(($nextInstruction, $prevInstruction, kinStudies) => {
      var slug = $nextInstruction.params.study;
      return slug === "_" || kinStudies.getBySlug(slug)
        .then(study => !!study, error => true);
    }),
    bindings: { $router: "<" },
    controller: class {
      $router: any;
      study: Models.Study;

      // @ngInject
      constructor(private kinStudies: StudiesService, $timeout: ng.ITimeoutService) {
        kinStudies.onSetFallback = from => {
          // Adjust the route ... the timeout is to prevent redirect loops.
          // Would be nicer to just change the url and not renavigate.
          var next = _.concat(['/App/Studies', {study: kinStudies.current.slug}], from);
          $timeout(0).then(() => this.$router.navigate(next));
        };
      }

      $routerOnActivate(next, previous) {
        var slug = next.params.study;
        if (slug !== "_") {
          return this.kinStudies.getBySlug(slug).then(study => {
            this.study = study;
            this.kinStudies.setStudy(slug);
          });
        } else {
          // when slug is _, setting the study will be deferred until
          // the patient study membership is loaded, and the first
          // study will be chosen.
          this.study = null;
          this.kinStudies.setStudy(null);
        }
      }

      $routerOnDeactivate(next, previous) {
        this.kinStudies.setStudy(null);
      }
    }
  };

  export let StudyHomeView: ng.IComponentOptions = {
    templateUrl: "app/study/home.html",
    bindings: { $router: "<" },
    controller: class {
      study: Models.Study;

      // @ngInject
      constructor(private kinStudies: StudiesService) {
      }

      $onInit() {
        this.study = this.kinStudies.current;
      }
    }
  };

  export class RouterConfig {
    // @ngInject
    constructor($locationProvider: ng.ILocationProvider, appConfig: AppConfig) {
      $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
      });
    }
  }

  export class LoginRedirectRunBlock {
    // @ngInject
    constructor($rootScope: ng.IScope, kinLoginRedirect: LoginRedirectService, kinSession: SessionService) {
      $rootScope.$on("usersessionChange", (event, user) => kinLoginRedirect.userSessionChange(user));
    }
  }

  export class LoginRedirectService {
    redirect: any; // router instruction
    redirectUrl: string; // string;

    // @ngInject
    constructor(private $rootRouter, private $location: ng.ILocationService,
                private kinSession: SessionService) {
    }

    checkLogin(next) {
      if (!this.kinSession.user.loggedIn) {
        this.setRedirect(next);
        this.gotoLoginPage();
      }
      return !!this.kinSession.user.loggedIn;
    }

    avoidLoginPage(next) {
      if (this.kinSession.user.loggedIn) {
        this.$rootRouter.navigate(["App"]);
      }
      return !this.kinSession.user.loggedIn;
    }

    setRedirect(nextInstruction) {
      var loginInstruction = this.$rootRouter.generate(["Login"]);

      if (!_.isEqual(nextInstruction, loginInstruction)) {
        // fixme: might be nicer to store redirect url in ?next= url param
        this.redirect = nextInstruction;
      } else {
        this.redirect = this.$rootRouter.generate(["App"]);
      }

      var nextUrl = this.$location.url();
      var loginUrl = loginInstruction.toRootUrl();

      if (nextUrl !== loginUrl) {
        this.redirectUrl = nextUrl;
      } else {
        this.redirectUrl = this.$rootRouter.generate(["App"]).toRootUrl();
      }
    }

    userSessionChange(user: Models.User) {
      if (user.loggedIn) {
        /* // navigateByInstruction doesn't seem to work ... use normal urls instead
        console.log("userSessionChange logged in", this.redirect);
        if (this.redirect) {
          console.log("navigating");
          this.$rootRouter.navigateByInstruction(this.redirect);
          this.redirect = null;
        }
        */
        if (this.redirectUrl) {
          this.$location.url(this.redirectUrl);
          this.redirect = null;
        } else {
          this.$rootRouter.navigate(['App']);
        }
      } else {
        this.gotoLoginPage();
      }
    }

    gotoLoginPage() {
      this.$rootRouter.navigate(["Login"]);
    }
  }

  export let GoView: ng.IComponentOptions = {
    template: "Redirecting...",
    controller: class {
      // @ngInject
      constructor(private $rootRouter, private kinIdLookup: IdLookupService) {
      }

      private go(result: IdLookupResult) {
        var resourceMap = {
          person: (id, study) => ["App", "Studies", { study: study }, "Person", "Detail", { id: id }],
          sample: (id, study) => study ?
            ["App", "Studies", { study: study }, "Biobank", "Detail", { id: id }] :
            ["App", "Biobank", "Detail", { id: id }]
        };
        var redir = result ? resourceMap[result.resource] : null;
        this.$rootRouter.navigate(redir ? redir(result.id, result.study) : ["App"]);
      }

      $routerOnActivate(next, previous) {
        var id = next.params.id;
        return this.kinIdLookup.lookup(id).then(result => this.go(result));
      }
    }
  };

  /**
   * This controller can be used in a route component to stash its
   * route params, so that child components can access
   * them. Workaround for angular issue #6204.
   */
  export class RouteParamsCtrl {
    private routeParams: string[];

    // @ngInject
    constructor(private kinRouteParams: RouteParamsService) {
    }

    $routerOnActivate(next, previous) {
      this.routeParams = _.keys(next.params);
      this.kinRouteParams.update(next.params);
    }

    $routerOnDeactivate(next, previous) {
      this.kinRouteParams.remove(this.routeParams);
    }
  }

  /**
   * A little service to store route parameters to enable child routes
   * to access parameters of their parents. Workaround for angular
   * issue #6204.
   */
  export class RouteParamsService {
    public params = {};
    update(params: {}) {
      return _.assign(this.params, params);
    }
    remove(keys: string[]) {
      _.each(keys, key => {
        delete this.params[key];
      });
    }
  }

  export class RouteUtilService {
    // @ngInject
    constructor(private $rootRouter, private $location: ng.ILocationService) {
    }

    /**
     * Determines if a route is active. This method is really
     * crappy but the angular component router doesn't seem to
     * provide any API to determine if a route is active.
     */
    isActive(urlFrag: string) {
      //var instruction = this.$rootRouter.generate([childRouteName]);
      //return this.$rootRouter.isRouteActive(instruction);
      return urlFrag && this.$location.path().indexOf(urlFrag) >= 0;
    }

    isHome() {
      var home = this.$rootRouter.generate(['App', 'Home']);
      var homeUrl = "/" + home.toRootUrl();
      return this.$location.path() === homeUrl;
    }

    isStudyHome(slug: string) {
      var path = this.$location.path();
      return slug && path.lastIndexOf(slug) === path.length - slug.length;
    }

    /**
     * For some reason, ng-link="['Home']" doesn't work, so make it
     * here with the root router.
     */
    homeLink() {
      return "./" + this.$rootRouter.generate(['App', 'Home']).toRootUrl();
    }


    generate(route: any[]) {
      var instruction = this.$rootRouter.generate(route);
      return instruction.toRootUrl();
    }

    activeClass(route: any, extra?: {}) {
      return _.assign({ active: this.isActive(route) }, extra);
    }

    stateActive(parts1: string, parts2: string, parts3: string) {
      // fixme: implement, and varargs
      return true;
    }
  }

  angular.module("kindred.route", [])
    .component("kinAppView", AppView)
    .component("kinTopLevelView", TopLevelView)
    .component("kinHomeView", HomeView)
    .component("kinLoginView", LoginView)
    .component("kinStudiesView", StudiesView)
    .component("kinStudyHomeView", StudyHomeView)
    .component("kinGoView", GoView)
    .config(RouterConfig)
    .controller("RouteParamsCtrl", RouteParamsCtrl)
    .service("kinRouteParams", RouteParamsService)
    .service("kinRouteUtil", RouteUtilService)
    .service("kinLoginRedirect", LoginRedirectService)
    .run(LoginRedirectRunBlock)
    .value("$routerRootComponent", "kinAppView");
}
