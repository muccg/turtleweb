module SearchParser {
  'use strict';

  import K = kindred;

  export interface Dmy {
    year: number; /* four-digit year */
    month?: number; /* month 0-11 */
    day?: number; /* day of month 1-31 */
  }

  export interface DateRange {
    start?: Dmy;
    end?: Dmy;
  }

  /* takes a day/month/year object and returns a moment with missing
   * fields added */
  export function dateFill(dmy: Dmy, end: boolean) {
    var d = moment(_.assign({ day: 1, month: 0 }, dmy));
    if (end) {
      if (_.isUndefined(dmy.month)) {
        d.month(11).date(31);
      } else if (_.isUndefined(dmy.day)) {
        d.date(d.daysInMonth());
      }
    }
    return d;
  }

  /* takes a moment and returns day/month/year object */
  export function dateUnFill(d: moment.Moment, end?: boolean): Dmy {
    var dmy:Dmy = { year: d.year() };
    if ((end && d.date() === d.daysInMonth()) || (!end && d.date() === 1)) {
      if ((!end || d.month() !== 11) && (end || d.month() !== 0)) {
        dmy.month = d.month();
      }
    } else {
      dmy.day = d.date();
      dmy.month = d.month();
    }
    return dmy;
  }

  export function fmtDmy(dmy: Dmy): string {
      var ar = [dmy.year];
      if (!_.isUndefined(dmy.month)) {
        ar.unshift(dmy.month + 1)
      }
      if (!_.isUndefined(dmy.day)) {
        ar.unshift(dmy.day);
      }
      return ar.join("/");
    }

  export function dateFmt(dmy: Dmy, end: boolean): string {
    return dmy ? dateFill(dmy, end).format("YYYY-MM-DD") : "";
  }

  export interface UnfillFunc {
    (d: moment.Moment, end?: boolean): Dmy;
  }

  export function fmtRange(range: DateRange, unfill: UnfillFunc) : string {
    var parts = [];
    if (range && range.start) {
      parts.push(fmtDmy(unfill(moment(range.start))));
    }
    parts.push("-");
    if (range && range.end) {
      parts.push(fmtDmy(unfill(moment(range.end), true)));
    }
    if (parts.length === 3 && parts[0] === parts[2]) {
      return parts[0];
    } else if (parts.length > 1) {
      return parts.join("");
    } else {
      return "";
    }
  }

  /* formats a date range expression into a range string.
   * start and end dates are expected to be moment objects. */
  export function fmtDateRange(range: DateRange): string {
    return fmtRange(range, dateUnFill);
  }

  export function fmtDmyRange(range: DateRange) : string {
    return fmtRange(range, _.identity);
  }

  export function parseDateRange(rangeStr: string): DateRange {
    var dp = /^(?:(?:(\d{1,2})\/)?(\d{1,2})\/)?(?:((?:\d\d){2}))$/;
    var getDmy = function(m: string[]): Dmy {
      var dmy: Dmy = {
        year: parseInt(m[3], 10)
      };
      if (m[2]) {
        dmy.month = parseInt(m[2], 10) - 1;
      }
      if (m[1]) {
        dmy.day = parseInt(m[1], 10);
      }
      return dmy;
    };

    var parseDate = function(s: string): Dmy {
      var m = dp.exec(s);
      return m ? getDmy(m) : null;
    };

    if (rangeStr) {
      var parts = rangeStr.split("-", 2);
      if (parts.length === 1) {
        var dmy = parseDate(parts[0]);
        return dmy ? {
          start: dmy,
          end: dmy
        } : null;
      } else if (parts.length === 2) {
        var range: DateRange = {};
        if (parts[0]) {
          range.start = parseDate(parts[0]);
        }
        if (parts[1]) {
          range.end = parseDate(parts[1]);
        }
        return (range.start !== null && range.end !== null) ? range : null;
      }
    } else {
      return null;
    }
  }

  /* The date picker can give you either a string or a javascript
   * date object. This function is prepared for anything. */
  export function anyToMoment(t) {
    if (moment.isDate(t)) {
      // javascript date object
      return moment(t)
    } else if (moment.isMoment(t)) {
      // moment object
      return t;
    } else if (t.year) {
      // object with .year .month .day
      return moment(t);
    } else if (t) {
      // string
      return moment(t, "YYYY-MM-DD");
    }
  }

  /* converts a date range from query parser into an actual range of
   * ISO-8601 formatted dates. */
  export function isoDateRange(range: DateRange): Search.IsoDateRange {
    return {
      start: range.start ? dateFmt(range.start, false) : null,
      end: range.end ? dateFmt(range.end, true) : null
    };
  }

  export function unIsoDateRange(range: Search.IsoDateRange): DateRange {
    function p(s) {
      return moment(s, "YYYY-MM-DD");
    }

    var ret: DateRange = {};
    if (range.start) {
      ret.start = dateUnFill(p(range.start), false);
    }
    if (range.end) {
      ret.end = dateUnFill(p(range.end), true);
    }
    return ret;
  }

  export function maybeQuote(s: string): string {
    if (s.indexOf(" ") >= 0) {
      return '"' + s + '"';
    }
    return s;
  }

  export function format(val: BaseParser.SearchQuery): string {
    function fmt(val: BaseParser.SearchQuery) : any[] {
      var andval = <BaseParser.SearchQueryAnd>val;
      var orval = <BaseParser.SearchQueryOr>val;
      var notval = <BaseParser.SearchQueryNot>val;
      var fieldval = <BaseParser.SearchQueryField>val;
      if (_.isEmpty(val)) {
        return [];
      } else if (typeof val === "string") {
        return [maybeQuote(val)];
      } else if (andval.and) {
        // fixme: multiple terms
        return [fmt(andval.and[0]), "AND", fmt(andval.and[1])];
      } else if (orval.or) {
        // fixme: multiple terms
        return [fmt(orval.or[0]), "OR", fmt(orval.or[1])];
      } else if (notval.not) {
        // fixme: parentheses
        return ["NOT", fmt(notval.not)];
      } else if (fieldval.name) {
        return [[fieldval.name.join("."),
                 fieldval.exact ? "::" : ":",
                 maybeQuote(fieldval.value)].join("")]
      }
    };
    return _(fmt(val)).flatten().join(" ");
  }
}
