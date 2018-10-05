module kindred {
  'use strict';

  export module dtutil {
    const types = _(["jsdate", "moment", "isodate", "isodatetime"]);
    export const fmt = {
      uiDate: 'DD/MM/YYYY',
      uiTime: 'HH:mm:ss',
      isodate: "YYYY-MM-DD",
      isodatetime: "YYYY-MM-DDTHH:mm:ssZ"
    };

    export function toMoment(val: moment.Moment|Date|string): moment.Moment {
      var ret;
      if (moment.isMoment(val)) {
        ret = moment(val);
      } else if (moment.isDate(val)) {
        ret = moment(val);
      } else if (_.isString(val)) {
        ret = parseDate(val);
      }

      if (val && !ret) {
        console.warn("toMoment: can't convert this thing", val);
      }

      return ret;
    }

    export function defaultToday(date) {
      return date ? date : isoToday();
    }

    export function modelFormat(m: moment.Moment, type: string, utc?: boolean): moment.Moment|Date|string {
      if (m) {
        if (type == "jsdate") {
          return m.toDate();
        } else if (type == "isodate") {
          return m.format(fmt.isodate)
        } else if (type == "isodatetime") {
          if (utc) {
            m = m.tz("UTC");
          }
          return m.format(fmt.isodatetime);
        } else if (type == "moment") {
          return m;
        }
      }
    }

    export function viewFormat(val: moment.Moment|Date|string, type: string): moment.Moment {
      if (val) {
        if (type == "jsdate") {
          return moment(val);
        } else if (type == "isodate") {
          return moment(<string>val, fmt.isodate);
        } else if (type == "isodatetime") {
          return moment(<string>val, fmt.isodatetime);
        } else if (type == "moment") {
          return moment(val);
        }
      }
    }

    export function parseTime(value: string): moment.Moment {
      return _(["H:m:s", "H:m", "H"])
        .map(fmt => moment(value, fmt, true))
        .filter(m => m.isValid())
        .first();
    }

    /**
     * Converts a date string to a moment. Parsing is only attempted
     * if string is in d/m/y or y-m-d format.
     */
    export function parseDate(value: string): moment.Moment {
      if (/^\d+\/\d+\/\d+/.test(value)) {
        return moment(value, fmt.uiDate);
      } else if (/^\d+-\d+-\d+/.test(value)) {
        return moment(value, fmt.isodatetime);
      }
    }

    export function parseApiDate(apiDateStr: string): moment.Moment {
      return moment(apiDateStr, fmt.isodate);
    }

    export function parseApiDateTime(apiDateStr: string): moment.Moment {
      return moment(apiDateStr, fmt.isodatetime);
    }

    export function apiDateTimeSame(a: string, b: string): boolean {
      return (!a && !b) ||
        (a && b && parseApiDateTime(a).isSame(parseApiDateTime(b)));
    }

    export function checkType(directiveName: string): (type: string) => void {
      return type => {
        if (type && !types.includes(type)) {
          console.warn(directiveName + ": " + type + ": type must be one of " + types.join(", "));
        }
      };
    }

    export function isoNow(): string {
      return moment().format(fmt.isodatetime);
    }

    export function isoToday(): string {
      return moment().format(fmt.isodate);
    }

    export function defaultNow(datetime: string): string {
      return datetime ? datetime : this.isoNow();
    }
  }

  export type DateTimeUtilService = typeof dtutil;

  angular.module("kindred.components.datetime.services", [])
    .factory('kinDateTimeUtil', () => dtutil);
}
