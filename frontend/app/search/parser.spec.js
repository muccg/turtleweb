'use strict';

describe("kindred.search.services module", function() {
  beforeEach(module("kindred.search.parser"));
  beforeEach(module("kindred.search.services"));

  describe('search parser', function() {

    it('should parse an empty query', inject(function(baseSearchParser) {
      var parsed = baseSearchParser.parse("");
      expect(parsed).toBe(null);
    }));

    it('should parse a single term query', inject(function(baseSearchParser) {
      var parsed = baseSearchParser.parse("qwerty");
      expect(parsed).toEqual("qwerty");
    }));

    it('should parse a multiple term query', inject(function(baseSearchParser) {
      var parsed = baseSearchParser.parse("qwerty asdf");
      expect(parsed).toEqual({ and: ["qwerty", "asdf"] });
    }));

    it('should parse a keyword query', inject(function(baseSearchParser) {
      var parsed = baseSearchParser.parse("qwerty:asdf");
      expect(parsed).toEqual({ name: ["qwerty"], value: "asdf", exact: false });
    }));

    it('should parse a date range', inject(function(searchParserUtil) {
      var parsed = searchParserUtil.parseDateRange("1/2/2003-3/4/2005");
      expect(parsed).toEqual({
        start: {
          year: 2003,
          month: 1,
          day: 1
        },
        end: {
          year: 2005,
          month: 3,
          day: 3
        }
      });
    }));

    it('should parse an open date range - left', inject(function(searchParserUtil) {
      var parsed = searchParserUtil.parseDateRange("-3/4/2005");
      expect(parsed).toEqual({
        end: {
          year: 2005,
          month: 3,
          day: 3
        }
      });
    }));

    it('should parse an open date range - right', inject(function(searchParserUtil) {
      var parsed = searchParserUtil.parseDateRange("1/2/2003-");
      expect(parsed).toEqual({
        start: {
          year: 2003,
          month: 1,
          day: 1
        }
      });
    }));

    it('should parse a single year range', inject(function(searchParserUtil) {
      var parsed = searchParserUtil.parseDateRange("2003");
      expect(parsed).toEqual({
        start: {
          year: 2003
        },
        end: {
          year: 2003
        }
      });
    }));

    it('should parse a single month range', inject(function(searchParserUtil) {
      var parsed = searchParserUtil.parseDateRange("5/2003");
      expect(parsed).toEqual({
        start: {
          year: 2003,
          month: 4
        },
        end: {
          year: 2003,
          month: 4
        }
      });
    }));

    it('should parse a big query', inject(function(baseSearchParser) {
      expect(baseSearchParser).toBeDefined();

      var q = "frog and cat Or dog AND not mouse fred:flintstone dob:1/1/1950-5/5/2000 alive:true";
      var parsed = baseSearchParser.parse(q);

      expect(parsed).toEqual({
        and: [{
          and: [{
            and: [{
              and: [{
                or: [{
                  and: ['frog', 'cat']
                }, 'dog']
              }, {
                not: 'mouse'
              }]
            }, {
              name: ['fred'],
              value: 'flintstone',
              exact: false
            }]
          }, {
            name: ['dob'],
            value: '1/1/1950-5/5/2000',
            exact: false
          }]
        }, {
          name: ['alive'],
          value: 'true',
          exact: false
        }]
      });
    }));
  });

  describe('api search expression builder', function() {

    describe('iso date range', function() {
      it('should convert an open year range', inject(function(searchParserUtil) {
        var range = { start: { year: 2015 } };
        var iso = { start: "2015-01-01", end: null };
        expect(searchParserUtil.isoDateRange(range)).toEqual(iso);
        expect(searchParserUtil.unIsoDateRange(iso)).toEqual(range);
      }));

      it('should convert an open year-month range', inject(function(searchParserUtil) {
        var range = { start: { year: 2015, month: 5 } };
        var iso = { start: "2015-06-01", end: null }
        expect(searchParserUtil.isoDateRange(range)).toEqual(iso);
        expect(searchParserUtil.unIsoDateRange(iso)).toEqual(range);
      }));

      it('should convert an open year-month-day range', inject(function(searchParserUtil) {
        var range = { start: { year: 2015, month: 0, day: 26 } };
        var iso = { start: "2015-01-26", end: null };
        expect(searchParserUtil.isoDateRange(range)).toEqual(iso);
        expect(searchParserUtil.unIsoDateRange(iso)).toEqual(range);
      }));

      it('should convert a right-open range', inject(function(searchParserUtil) {
        var range = { end: { year: 2015, month: 3, day: 1 } };
        var iso = searchParserUtil.isoDateRange(range);
        expect(iso).toEqual({ start: null, end: "2015-04-01" });
      }));

      it('should convert a closed same-year range', inject(function(searchParserUtil) {
        var range = { start: { year: 2015 }, end: { year: 2015 } };
        var iso = { start: "2015-01-01", end: "2015-12-31" };
        expect(searchParserUtil.isoDateRange(range)).toEqual(iso);
        expect(searchParserUtil.unIsoDateRange(iso)).toEqual(range);
      }));

      it('should convert a closed different-year range', inject(function(searchParserUtil) {
        var range = { start: { year: 2014 }, end: { year: 2016 } };
        var iso = { start: "2014-01-01", end: "2016-12-31" };
        expect(searchParserUtil.isoDateRange(range)).toEqual(iso);
        expect(searchParserUtil.unIsoDateRange(iso)).toEqual(range);
      }));

      it('should convert a closed same-year-month range', inject(function(searchParserUtil) {
        var range = { start: { year: 2015, month: 3 }, end: { year: 2015, month: 3 } };
        var iso = { start: "2015-04-01", end: "2015-04-30" };
        expect(searchParserUtil.isoDateRange(range)).toEqual(iso);
        expect(searchParserUtil.unIsoDateRange(iso)).toEqual(range);
      }));

      it('should convert a closed different-year-month range', inject(function(searchParserUtil) {
        var range = { start: { year: 2014, month: 3 }, end: { year: 2015, month: 5 } };
        var iso = { start: "2014-04-01", end: "2015-06-30" };
        expect(searchParserUtil.isoDateRange(range)).toEqual(iso);
        expect(searchParserUtil.unIsoDateRange(iso)).toEqual(range);
      }));

      it('should convert another closed range', inject(function(searchParserUtil) {
        var range = { start: { year: 2014, month: 0 }, end: { year: 2015 } };
        var range2 = { start: { year: 2014 }, end: { year: 2015 } };
        var iso = { start: "2014-01-01", end: "2015-12-31" };
        expect(searchParserUtil.isoDateRange(range)).toEqual(iso);
        expect(searchParserUtil.unIsoDateRange(iso)).toEqual(range2);
      }));

      it('should convert end of year range', inject(function(searchParserUtil) {
        var range = { end: { year: 2015, month: 11 } };
        var range2 = { end: { year: 2015 } };
        var iso = { start: null, end: "2015-12-31" };
        expect(searchParserUtil.isoDateRange(range)).toEqual(iso);
        expect(searchParserUtil.unIsoDateRange(iso)).toEqual(range2);
      }));


    });

    describe('format date range', function() {
      it('should format open year range', inject(function(searchParserUtil) {
        var range = { start: moment({ year: 2015 }) };
        var fmt = "2015-";
        expect(searchParserUtil.fmtDateRange(range)).toEqual(fmt);
      }));

      it('should format open year-month range', inject(function(searchParserUtil) {
        var range = { start: moment({ year: 2015, month: 5 }) };
        var fmt = "6/2015-";
        expect(searchParserUtil.fmtDateRange(range)).toEqual(fmt);
      }));

      it('should format open year-month-day range', inject(function(searchParserUtil) {
        var range = { start: moment({ year: 2015, month: 0, day: 26 }) };
        var fmt = "26/1/2015-";
        expect(searchParserUtil.fmtDateRange(range)).toEqual(fmt);
      }));

      it('should format left-open year', inject(function(searchParserUtil) {
        var range = { end: moment({ year: 2015, month: 11, day: 31 }) };
        var fmt = "-2015";
        expect(searchParserUtil.fmtDateRange(range)).toEqual(fmt);
      }));

      it('should format left-open year-month', inject(function(searchParserUtil) {
        var range = { end: moment({ year: 2015, month: 7, day: 31 }) };
        var fmt = "-8/2015";
        expect(searchParserUtil.fmtDateRange(range)).toEqual(fmt);
      }));

    });
  });

});
