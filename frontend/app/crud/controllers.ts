module kindred {
  'use strict';

  export interface RestangularElement extends restangular.IElement {
    /**
     * Flag which Restangular uses to determine whether to POST or PUT
     * on save. It seems to be missing from restangular.d.ts
     */
    fromServer?: boolean;
  }

  export type CrudElement = RestangularElement & Models.AnyElement;

  /**
   * Common functions used by both the detail and edit crud
   * controllers.
   */
  export class BaseCrudCtrl<T extends CrudElement> {
    /** object to fetch and examine */
    item: T;

    /** flag for the template to hide while loading */
    isLoaded: boolean;

    /** prevent double loading by caching the promise */
    private loadingPromise: ng.IPromise<T>

    /** current study ... it's often needed */
    currentStudy: Models.Study;

    /** params passed with the route */
    protected viewParams: {};

    /** angular $router bound by the component options */
    protected $router: any;

    /** bundle of injected dependencies */
    protected s: BaseEditService<T>;

    // @ngInject
    constructor(kinBaseEdit: BaseEditService<T>) {
      this.s = kinBaseEdit;
    }

    $onInit() {
      this.isLoaded = false;
      this.currentStudy = this.s.kinStudies.current;
    }

    /**
     * Hook for loading something before edited item is loaded.
     */
    protected getDeps(params: {}): PromisePerhaps<any> {
    }

    /**
     * Hook for loading anything else before component route is activated.
     */
    protected getMoreDeps(item: T): PromisePerhaps<any> {
    }

    /**
     * Hook for filling in fields on the item before a working copy is
     * cloned.
     */
    protected initItem(item: T): T {
      return item;
    }

    /**
     * Set the item
     */
    protected load(item: T): T {
      this.item = item;
      return this.item;
    }

    /**
     * Inheriting classes should set a static `resourceName` property.
     */
    protected getResourceName() {
      return this.constructor["resourceName"];
    }

    /**
     * Retrieves/creates the item as a prerequisite for activating
     * the component route.
     */
    protected getItem(params: {}): ng.IPromise<T> {
      return this.s.getItem(this.getResourceName(), params);
    }

    /**
     * Hook which is run almost at the very end of the fetching and
     * loading process.
     */
    protected itemLoaded(item: T): T {
      return item;
    }

    /**
     * Component router activation phase. The route will become active
     * once this promise resolves.
     *
     * The view outlet will be rendered before activation completes,
     * so it's a good idea to hide everything in the template using
     * the `isLoaded` flag.
     */
    $routerOnActivate(next, previous) {
      if (!this.loadingPromise) {
        this.loadingPromise = this.doLoad(next)
          .catch(reason => {
            this.s.kinError.errorModal({
              type: "router",
              data: {
                next: next,
                previous: previous
              }
            }).finally(() => {
              // navigate somewhere else, going to previous doesn't work though
              // this.$router.navigateByInstruction(previous);
              this.$router.navigate(["/App"]);
            });
            return null;
          });
      }
      return this.loadingPromise;
    }

    protected doLoad(instruction) {
      this.viewParams = this.s.fixParams(instruction);
      return this.s.$q.resolve(this.getDeps(this.viewParams))
        .then(() => this.getItem(this.viewParams))
        .then(item => this.load(this.initItem(item)))
        .then(item => this.s.$q.resolve(this.getMoreDeps(item)).then(() => item))
        .then(item => this.itemLoaded(item))
        .then(item => { this.isLoaded = true; return item; });
    }
  }

  /**
   * A class which CRUD detail component controllers should inherit from.
   */
  export class BaseDetailCtrl<T extends CrudElement> extends BaseCrudCtrl<T> {
  }

  /**
   * This service is just a way of bundling up dependencies.
   */
  export class BaseEditService<T extends CrudElement> {
    // @ngInject
    constructor(public Restangular: restangular.IService,
                public $rootRouter,
                public $q: ng.IQService,
                public kinRouteParams: RouteParamsService,
                public kinStudies: StudiesService,
                public kinDdl: DdlService,
                public kinSaving: SavingService,
                public kinConfirm: ConfirmService,
                public kinError: ErrorService,
                public kinSession: SessionService,
                public kinPreFill: PreFillService) {
    }

    /**
     * Merge in params collected by kinRouteParams service. This is
     * the only way to get all params for the route.
     */
    fixParams(nextInstruction) {
      return _.assign({}, this.kinRouteParams.params, nextInstruction.params);
    }

    getItem(resourceName: string, params: {}, idParam = "id", initial?: {}): ng.IPromise<T> {
      if (idParam && params.hasOwnProperty(idParam)) {
        return this.Restangular.one(resourceName, params[idParam]).get();
      } else {
        // blank object (based on prefill data if it exists)
        var ob = $.extend({}, initial, this.kinPreFill.get());
        return this.$q.resolve(this.Restangular.restangularizeElement(null, ob, resourceName, false));
      }
    }
  }

  /**
   * A class which CRUD edit component controllers should inherit from.
   */
  export class BaseEditCtrl<T extends CrudElement> extends BaseCrudCtrl<T> {
    /** Object received from server **/
    orig: T;

    /** Timestamp of first edit, for showing in template. */
    dirtyTime: moment.Moment;

    // @ngInject
    constructor(kinBaseEdit: BaseEditService<T>) {
      super(kinBaseEdit);
    }

    $onInit() {
      super.$onInit();
      this.dirtyTime = moment();
    }

    /**
     * Sets up the working copy of item if it's a restangular object
     * (i.e. come from the rest api).
     */
    protected load(item: T): T {
      this.orig = item;
      if (item.fromServer) {
        this.item = <T>item.clone();
      } else {
        // working around an restangular bug with clone() and restangularizeElem()
        this.item = item;
      }
      return this.item;
    }

    isClean() {
      return this.rememberTime(angular.equals(this.orig, this.item));
    }

    /**
     * Returns whether the edited item is a new one being created, or
     * an existing object being updated.
     */
    isNew() {
      return angular.isUndefined(this.item.id);
    }

    protected rememberTime(clean: boolean) {
      if (!clean && !this.dirtyTime) {
        this.dirtyTime = moment();
      }
      return clean;
    }

    save() {
      var copy = this.copyElem(this.item);
      var action = this.s.$q.resolve(copy)
        .then((item: T) => this.beforeSave(item))
        .then(item => this.doSave(item))
        .then(item => this.afterSave(item))
        .then(item => this.load(item))
        .then(item => this.redirect(item));

      return this.s.kinSaving.monitor(action);
    }

    /**
     * Makes the API request to save the item.
     */
    protected doSave(item: T): ng.IPromise<T> {
      return item.save();
    }

    /**
     * Make a copy of the item so the before-save mungings won't
     * appear in the form.
     */
    protected copyElem<U extends RestangularElement>(item: U): U {
      var copy = <U>item.clone();
      copy.fromServer = item.fromServer;
      return copy;
    }

    /**
     * Hook for controllers to do some actions before POSTing the
     * item.
     */
    protected beforeSave(item: T): PromisePerhaps<T> {
      return item;
    }

    /**
     * Hook for controllers to do some actions after item has been
     * successfully POSTed, before the item is loaded into the view.
     */
    protected afterSave(updated: T): PromisePerhaps<T> {
      return updated;
    }

    /**
     * Hook for controllers to change the location which is visited
     * after saving. Helpful to have the component $router bound to
     * the controller.
     */
    protected redirect(item) {
      if (this.$router) {
        var next = this.redirectRoute(item);
        if (next) {
          this.$router.navigate(next);
        }
      }
      return item;
    }

    /**
     * Hook for overriding the route used to redirect after save.
     */
    protected redirectRoute(item): any[] {
      return ["Detail", {id: item.id}];
    }

    /**
     * Easier way to restangularize an object.
     */
    protected bless(plain: {}, resource: string): RestangularElement {
      var item: RestangularElement = null;
      if (plain) {
        item = this.s.Restangular.restangularizeElement(null, plain, resource);
        item.fromServer = !!plain["id"];
      }
      return item;
    }

    /**
     * Prevent user changes from being accidentally discarded.
     */
    $routerCanDeactivate(next, prev): PromisePerhaps<boolean> {
      return this.isClean() ||
        !this.s.kinSession.user.loggedIn ||
        this.confirmDiscard();
    }

    protected confirmDiscard(): PromisePerhaps<boolean> {
      return this.s.kinConfirm.ask(<any>{
        dirtyTime: this.dirtyTime,
        size: "",
      }, "discard-confirm").then((save: boolean) => {
        if (save === true) {
          return this.save().then(() => true);
        } else {
          return true;
        }
      }, () => false);
    }
  }

  angular.module("kindred.crud.controllers", [])
    .service("kinBaseEdit", BaseEditService);
}
