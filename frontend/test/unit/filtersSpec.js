'use strict';

/* jasmine specs for filters go here */

describe('filter', function() {
  beforeEach(module('kindred.filters'));

  describe("titleCase", function() {

    it("should capitalize", inject(function(titleCaseFilter) {
      expect(titleCaseFilter("asdf qwerty lah")).toEqual("Asdf Qwerty Lah");
    }));

    it("should capitalize", inject(function(titleCaseFilter) {
      expect(titleCaseFilter("asdf QWERTY lah")).toEqual("Asdf QWERTY Lah");
    }));

    it("should leave empty strings/undefined/etc", inject(function(titleCaseFilter) {
      expect(titleCaseFilter("")).toEqual("");
      expect(titleCaseFilter(null)).toBe(null);
      expect(titleCaseFilter(undefined)).toBeUndefined();
    }));
  });

  describe("checkmark", function() {
    it("should do something different for true and false", inject(function(checkmarkFilter) {
      expect(checkmarkFilter(false) != checkmarkFilter(true)).toEqual(true);
    }));
  });

  describe("personAge", function() {
    it("should return ten years old on birthday", inject(function(personAgeFilter) {
      expect(personAgeFilter({ dob : '1981-07-01' }, '1991-07-01')).toEqual("10 years old");
    }));

    it("should return ten years old on day before eleventh birthday", inject(function(personAgeFilter) {
      expect(personAgeFilter({ dob : '1981-07-01' }, '1992-06-30')).toEqual("10 years old");
    }));

    it("should return unborn", inject(function(personAgeFilter) {
      expect(personAgeFilter({ dob : undefined })).toEqual("unborn");
    }));
  });

  describe("titleCase", function() {
    it("should capitalize first letter", inject(function(capitalizeFilter) {
      expect(capitalizeFilter("slartibartfast")).toEqual("Slartibartfast");
    }));

    it("should keep caps on first letter", inject(function(capitalizeFilter) {
      expect(capitalizeFilter("Arthur")).toEqual("Arthur");
    }));
  });

  describe("personFullName", function() {
    it("should use first, middle, last if middle passed", inject(function(personFullNameFilter) {
      expect(
        personFullNameFilter({first_name: "Terrance", last_name: "Smith", second_name: "Fulstrom"}, true))
      .toEqual("Terrance Fulstrom Smith");
    }));
    it("should use first, last if middle not passed", inject(function(personFullNameFilter) {
      expect(
        personFullNameFilter({first_name: "Terrance", last_name: "Smith", second_name: "Fulstrom"}))
      .toEqual("Terrance Smith");
    }));
    it("should return no name if person has no name information", inject(function(personFullNameFilter) {
      expect(
        personFullNameFilter({}))
      .toEqual("No name");
    }));
  });

  describe("personFormalName", function() {
    it("should use last, first if middle unset", inject(function(personFormalNameFilter) {
      expect(
        personFormalNameFilter({first_name: "Terrance", last_name: "Smith", second_name: "Fulstrom"}))
      .toEqual("Smith, Terrance");
    }));

    it("should use last, first middle if middle set", inject(function(personFormalNameFilter) {
      expect(
        personFormalNameFilter({first_name: "Terrance", last_name: "Smith", second_name: "Fulstrom"}, false, true))
      .toEqual("Smith, Terrance Fulstrom");
    }));

    it("should use last if not first or middle", inject(function(personFormalNameFilter) {
      expect(
        personFormalNameFilter({last_name: "Smith"}))
      .toEqual("Smith");
    }));

    it("should return no name if person has no name information and empty unset", inject(function(personFormalNameFilter) {
      expect(
        personFormalNameFilter({}))
      .toEqual("No name");
    }));

    it("should return nothing if person has no name information and empty set", inject(function(personFormalNameFilter) {
      expect(
        personFormalNameFilter({}, true))
      .toEqual("");
    }));
  });

  describe("join", function() {
    it("should join tokens", inject(function(joinFilter) {
      expect(joinFilter(['this', 'works'], '**')).toEqual("this**works");
    }));

    it("should return empty if no tokens", inject(function(joinFilter) {
      expect(joinFilter(undefined, '**')).toEqual("");
    }));
  });

  describe("capToSpace", function() {
    it("it should put spaces before each capital except the first", inject(function(capToSpaceFilter) {
      expect(capToSpaceFilter('ExcellentBudgerigarsInvestWisely')).toEqual("Excellent Budgerigars Invest Wisely");
    }));
  });

  describe("apiDateShow", function() {
    it("should return empty string for null object", inject(function(apiDateShowFilter) {
      expect(apiDateShowFilter(null)).toEqual('');
    }));

    it("should display API date in correct format", inject(function(apiDateShowFilter) {
      expect(apiDateShowFilter("1981-07-01")).toEqual('01/07/1981');
    }));
  })

  describe("choiceLookup", function() {
    var dummy_schema = {
      'fields' : {
        'parrots' : {
          'choices' : [
            ['K', 'Kea'],
            ['B', 'Budgerigar']
          ]
        }
      }
    };
    it("should look up correct value in given choices key", inject(function(choiceLookupFilter) {
      expect(choiceLookupFilter('B', dummy_schema, 'parrots'))
        .toEqual('Budgerigar');
    }));
    it("should return empty string for non-existant field", inject(function(choiceLookupFilter) {
      expect(choiceLookupFilter('B', dummy_schema, 'wombles'))
        .toEqual('');
    }));
    it("should return empty string for lookup against empty schema", inject(function(choiceLookupFilter) {
      expect(choiceLookupFilter('B', {}, 'parrots'))
        .toEqual('');
    }));
    it("should return empty string for lookup of null value", inject(function(choiceLookupFilter) {
      expect(choiceLookupFilter(null, dummy_schema, 'parrots'))
        .toEqual('');
    }));
  });
});

