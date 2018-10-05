'use strict';

describe("kindred.search.services module", function() {
  beforeEach(module("kindred.search"));

  beforeEach(module(function($provide) {
    $provide.service("kinQueryKeywords", function() {
      this.getAsync = function(study) {
        return {
          frog: [{
            name: "id",
            title: "Patient ID",
            type: "string",
            regexp: /((P-)?\d+)/i
          }, {
            name: "dob",
            title: "Birth date",
            type: "date"
          }]
        };
      };
    });
  }));

  var parser, parse, format;

  beforeEach(inject(function(searchParser, baseSearchParser, searchParserUtil) {
    parser = searchParser.make("frog", {});
    parse = function(str) {
      var expr = baseSearchParser.parse(str);
      return parser.parse(expr);
    };
    format = function(expr) {
      var fmt = parser.format(expr);
      return searchParserUtil.format(fmt);
    };
  }));

  describe('resource search parser', function() {

    it('should parse an empty query', function() {
      var parsed = parse("");
      expect(parsed).toBe(null);
    });

    it('should parse a date range', function() {
      var str = "dob:2/2000-5/5/2005";
      var parsed = parse(str);
      var expected = {
        name: ["dob"],
        value: {
          start: "2000-02-01",
          end: "2005-05-05"
        },
        exact: false
      };
      expect(parsed).toEqual(expected);
      expect(format(parsed)).toEqual(str);
    });

    it('should fail to parse unknown keyword', function() {
      expect(function() {
        parse("greeting:hello");
      }).toThrow(/*"Unknown keyword greeting"*/);
    });

  });
});
