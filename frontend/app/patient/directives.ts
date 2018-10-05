module kindred {
  'use strict';

  // @ngInject
  function percentageDirective(): ng.IDirective {
    return {
      restrict: 'A',
      require: '^ngModel',
      link: function(scope: any, elem, attrs, ngModel: ng.INgModelController) {
        var scale = function(s) {
          return function(val) {
            var f = parseFloat(val);
            if (_.isFinite(f)) {
              return f * s;
            } else {
              return undefined;
            }
          };
        };

        ngModel.$formatters.push(scale(100.0));
        ngModel.$parsers.push(scale(0.01));
      }
    };
  }

  // @ngInject
  function patientDupTableDirective(): ng.IDirective {
    return {
      restrict: "E",
      scope: {
        duplicates: '='
      },
      templateUrl: "app/patient/dup-table.html",
      link: function(scope, elem, attrs) {
      }
    };
  }

  class RemoveFromStudyCtrl {
    patient: Models.Person;
    studyMember: Models.StudyMember;
    $router: any;

    // @ngInject
    constructor(private kinStudies: StudiesService,
                private kinConfirm: ConfirmService,
                private kinFlash: FlashService) {
    }

    remove() {
      var study = this.kinStudies.getByUri(<string>this.studyMember.study);

      this.kinConfirm.ask({
        title: "Please confirm",
        msg: "This will remove the patient from the study, but not delete " +
          "the patient record. Are you sure you would like to remove this " +
          " patient from the " + study.name + " study?",
        action: "Remove"
      }).then(() => {
        this.studyMember.remove().then(success);
      });

      var success = () => {
        this.kinFlash.flash("Removed " + this.patient.patient_id +
                            " from the " + study.name + " study.");
        if (this.$router) {
          this.$router.navigate(["List"]);
        }
      };
    }
  }

  function removeFromStudyDirective(): ng.IDirective {
    return {
      restrict: "A",
      scope: {
        patient: "=kinRemoveFromStudy",
        studyMember: "=",
        $router: '<'
      },
      bindToController: true,
      controllerAs: "vm",
      controller: RemoveFromStudyCtrl,
      link: function(scope, elem, attrs, ctrl: RemoveFromStudyCtrl) {
        elem.on("click", ev => {
          scope.$apply(() => {
            if (!elem.is("[disabled]")) {
              ctrl.remove();
            }
          });
        })
      }
    };
  }

  function stickyDateCheckboxDirective(): ng.IDirective {
    return {
      restrict: "A",
      require: "ngModel",
      link: function(scope, elem, attrs, ngModel: ng.INgModelController) {
        var stickyDate: string;
        ngModel.$parsers.push(val => {
          if (val === true) {
            return moment().format();
          } else if (val === false) {
            return null;
          }
          return val;
        });
        ngModel.$formatters.push(val => {
          if (typeof val === "string") {
            stickyDate = val;
            return !!val;
          } else if (val === null) {
            return false;
          }
          return val;
        });
      }
    };
  }

  let editContactComponent: ng.IComponentOptions = {
    templateUrl: "app/patient/edit-contact.html",
    controllerAs: "vm",
    require: {
      ngModel: "ngModel"
    },
    bindings: {
      index: "<"
    },
    controller: class {
      ngModel: ng.INgModelController;
      form: ng.IFormController;
      index: number;

      /** the model */
      contact: Models.ContactDetails;

      /** filtered list of suburbs for autocomplete */
      suburbs: Models.Suburb[];

      /** countries plus placeholder */
      allCountries: Models.Country[];
      /** filtered list of countries for autocomplete*/
      countries: Models.Country[];

      /** country selected in gui */
      country: Models.Country;
      /** state selected in gui */
      state: Models.State;
      /** a concatenation of the four address lines */
      fullAddress: string;

      private placeholder = <Models.Country>{
        name: "Other",
        iso2: null
      };

      /** Initial place for addresses is Western Australia. */
      private def = {
        country: { iso2: "au" },
        state: { abbrev: "WA" }
      };

      // @ngInject
      constructor($scope: ng.IScope, private kinSuburb: SuburbService) {
        this.kinSuburb.getCountries().then(countries => {
          this.allCountries = _.concat(countries, [this.placeholder]);
          this.findCountry();
        });

        $scope.$watch(() => this.concatAddress(), fullAddress => {
          this.fullAddress = fullAddress;
        });
      }

      /**
       * Initialize the country and state dropdowns
       */
      private findCountry() {
        if (this.contact && this.allCountries) {
          if (this.contact.id) {
            if (this.contact.suburb) {
              this.country = _.find(this.allCountries, {
                resource_uri: this.contact.suburb["state"].country
              });
              if (this.country) {
                this.state = <any>_.find(this.country.states, {
                  id: this.contact.suburb["state"].id
                });
              }
            } else {
              this.country = this.placeholder;
            }
          } else {
            // set default value for new record
            this.country = _.find(this.allCountries, this.def.country);
            if (this.country) {
              this.state = <any>_.find(this.country.states, this.def.state);
            }
          }
        }
      }

      $onInit() {
        this.ngModel.$render = () => {
          this.contact = this.ngModel.$modelValue;
          this.findCountry();
        };
      }

      /** autocomplete suburb */
      refreshSuburbs(text: string) {
        if (text.length > 2) {
          var state = this.state ? this.state.abbrev : undefined;
          this.kinSuburb.lookup(text, state).then(suburbs => {
            this.suburbs = suburbs;
          });
        } else {
          this.suburbs = [];
        }
      }

      /** autocomplete country */
      refreshCountries(text: string) {
        this.countries = _.filter(this.allCountries, c => {
          return c.name.toLocaleLowerCase().indexOf(text.toLocaleLowerCase()) >= 0;
        });
        if (!_.includes(this.countries, this.placeholder)) {
          this.countries.push(this.placeholder);
        }
      }

      /** user changed country */
      countryChanged() {
        if (!this.country) {
          this.country = this.placeholder;
          this.contact.suburb = null;
        }
      }

      /** user changed suburb */
      suburbChanged() {
        if (this.contact.suburb) {
          var state = {
            id: this.contact.suburb["state"].id
          };
          this.state = <any>_.find(this.country.states, state);
        }
      }

      /** user changed state */
      stateChanged() {
        // clear suburb if different state chosen
        if (this.state && this.contact.suburb &&
            this.state.id !== this.contact.suburb["state"].id) {
          this.contact.suburb = null;
          this.suburbs = null;
        }
      }

      /** user changed fullAddress textarea */
      fullAddressChanged() {
        var lines = _(this.fullAddress.split("\n")).map(_.trim).filter(s => !!s)
          .map(s => <any>s).valueOf();
        this.contact.address_line1 = lines[0] || "";
        this.contact.address_line2 = lines[1] || "";
        this.contact.address_line3 = lines[2] || "";
        this.contact.address_line4 = lines[3] || "";
        // chop off excess lines
        this.fullAddress = this.concatAddress();
      }

      private concatAddress() {
        return _([
          this.contact.address_line1,
          this.contact.address_line2,
          this.contact.address_line3,
          this.contact.address_line4
        ]).map((s: string) => _.trim(s)).filter(s => !!s).join("\n");
      }
    }
  };

  angular.module("kindred.patient.directives", [])
    .directive("kinPercentage", percentageDirective)
    .directive("kinPatientDupTable", patientDupTableDirective)
    .directive("kinRemoveFromStudy", removeFromStudyDirective)
    .directive("kinStickyDateCheckbox", stickyDateCheckboxDirective)
    .component("kinEditContact", editContactComponent);
}
