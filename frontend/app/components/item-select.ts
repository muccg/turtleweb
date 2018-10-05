module kindred {
  'use strict';

  /**
   * kinSimpleSelect is intended to be used for picking items from
   * AbstractNameList models.
   */
  let simpleSelectComponent: ng.IComponentOptions = {
    require: {
      ngModel: 'ngModel'
    },
    bindings: {
      resource: '@options',
      extraClass: '@class',
      id: '@',
      filter: '<?',
      required: '@'
    },
    templateUrl: 'app/components/item-select/simple-select.html',
    controller: class {
      private ngModel: ng.INgModelController;

      item: Models.Any;
      filter: any;
      required: string;
      resource: string;

      options: Models.Any[];
      private promise: ng.IPromise<Models.Any[]>;
      private defaultOption: Models.Any;

      // @ngInject
      constructor($scope: ng.IScope, kinDdl: DdlService) {
        this.promise = kinDdl.get(this.resource);

        // check if there is a default option and remember it
        kinDdl.getDefault(this.resource).then(option => {
          this.defaultOption = option;
          this.ngModel.$render();
        });

        $scope.$watch("$ctrl.filter", () => this.ngModel.$render(), true);

        // empty required attribute still means required
        this.required = this.required === "" ? "required" : this.required;
      }

      $onInit() {
        this.ngModel.$render = () => this.render();
      }

      private render() {
        this.promise.then(options => {
          var val = this.ngModel.$viewValue || this.ngModel.$modelValue;

          this.options = options;
          if (this.filter) {
            this.options = _.filter(this.options, this.filter);
          }

          // set defaults on the control if it's a completely new record
          if (val === undefined) {
            if (!this.defaultOption) {
              // no default, but null isn't allowed, pick first
              if (this.required) {
                this.defaultOption = options[0];
              }
              // no default, but null is allowed, let it be null
              else {
                this.defaultOption = null;
              }
            }
            this.ngModel.$setViewValue(this.defaultOption);
          }
          // otherwise update the control with the new id
          else if (val) {
            this.item = _.find(options, option => val.id == option.id);
          }
        });
      }

      optionChanged() {
        this.ngModel.$setViewValue(this.item);
      }
    }
  };

  function selectOne(items, values) {
    return items.find(x => _.includes(values, x));
  }

  function parseOptions(str) {
    var KEYWORDS = ["blank", "unknown", "id", "uri", "object"];
    var words = _(str.trim().toLowerCase().split(/ /));
    var resource = words.difference(KEYWORDS).valueOf();
    var keywords = words.intersection(KEYWORDS);
    return {
      blank: keywords.includes("blank"),
      unknown: keywords.includes("unknown"),
      what: selectOne(keywords, ["id", "uri", "object"]) || "object",
      resource: resource[0],
      items: undefined
    };
  }

  function getItemValue(what, item) {
    return what === "id" ? ("" + item.id) : what === "uri" ? item.resource_uri : item;
  }

  // @ngInject
  function optionsDirective(kinDdl: DdlService, $timeout: ng.ITimeoutService): ng.IDirective {
    return {
      restrict: 'A',
      require: '^?ngModel',
      templateUrl: 'app/components/item-select/options.html',
      scope: {
        'kinOptions': '@'
      },
      link: function(scope, elem, attrs, ngModel: ng.INgModelController) {
        // make sure the correct option's set
        function kick(val) {
          elem.children("option").filter((i, el) => {
            var value = angular.element(el).attr("value");
            return value && value[0] === "?";
          }).remove();

          if (val && scope.opts &&
              (scope.opts.what !== "id" || (_.isNumber(val) && !_.isNaN(val)))) {
            $timeout(() => elem.val("" + val), 0);
          }
        }

        function setLoading(isLoading) {
          elem.toggleClass("loading", isLoading);
        }

        var updateOptions = function(kinOptions) {
          var opts = parseOptions(kinOptions || "");
          if (opts.resource) {
            var initValue = ngModel.$modelValue;
            opts.items = [{
              value: initValue,
              title: "Loading..."
            }];
            kick(initValue);
            setLoading(true);

            kinDdl.get(opts.resource).then(items => {
              opts.items = _.map(items, item => {
                return {
                  value: getItemValue(opts.what, item),
                  title: item.name
                };
              });
              kick(initValue || ngModel.$viewValue || ngModel.$modelValue);
              setLoading(false);
            });
          } else {
            opts.items = [];
          }
          scope.opts = opts;
        };

        // stringify incoming id values
        ngModel.$formatters.push(val => "" + val);

        // convert ids back into integers
        ngModel.$parsers.push(val => {
          if (scope.opts.what === "id" && typeof val === "string") {
            var num = parseInt(val, 10);
            if (!_.isNaN(num)) {
              val = num;
            }
          }
          return val;
        });

        scope.$watch("kinOptions", updateOptions);
      }
    };
  }

  let selectComponent: ng.IComponentOptions = {
    templateUrl: "app/components/item-select/select.html",
    require: {
      ngModel: "ngModel"
    },
    bindings: {
      options: "@",
      ngRequired: "<",
      ngDisabled: "<",
      id: "@",
      extraClass: "@class"
    },
    controllerAs: "$ctrl",
    controller: class {
      ngModel: ng.INgModelController;
      options: string;
      item: Models.Any;
      opts: {
        blank: boolean;
        unknown: boolean;
        what: "id" | "uri" | "object";
        resource: string;
        items: Models.Any[];
      };

      // @ngInject
      constructor($scope: ng.IScope, private $element: ng.IAugmentedJQuery, private kinDdl: DdlService) {
        $scope.$watch(() => this.options, options => this.updateOptions(options));
        this.updateOptions(this.options);
      }

      $onInit() {
        this.ngModel.$render = () => this.setItem();
      }

      /**
       * Model -> view
       */
      private setItem() {
        var val = this.ngModel.$modelValue || this.ngModel.$viewValue;
        this.item = _.find(this.opts.items, item => {
          if (this.opts.what === "id") {
            return item.id === val;
          } else if (this.opts.what === "uri") {
            return item.resource_uri === val;
          } else {
            return item === val;
          }
        });
      }

      /**
       * User modified <select> option
       */
      private optionChanged() {
        var val;
        if (this.opts.what === "id") {
          val = this.item ? this.item.id : null;
        } else if (this.opts.what === "uri") {
          val = this.item ? this.item.resource_uri : null;
        } else {
          val = this.item;
        }
        this.ngModel.$setViewValue(val);
      }

      private setLoading(isLoading: boolean) {
        this.$element.toggleClass("loading", !!isLoading);
      }

      private updateOptions(options: string) {
        var opts = parseOptions(options || "");
        if (opts.resource) {
          this.setLoading(true);

          this.kinDdl.get(opts.resource).then(items => {
            opts.items = items;
            this.setLoading(false);
            this.setItem();
          });
        } else {
          opts.items = [];
        }
        this.opts = opts;
      }
    }
  };

  angular.module("kindred.components.itemselect", [])
    .component('kinSimpleSelect', simpleSelectComponent)
    .component('kinSelect', selectComponent)
    .directive('kinOptions', optionsDirective);
}
