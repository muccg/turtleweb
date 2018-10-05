module kindred {
  'use strict';

  angular.module("kindred.components.datetime.filters", [
    "kindred.components.datetime.services"
  ])
  .filter('toMoment', function() {
    return function(text) {
      return text ? moment(text) : null;
    };
  })
  .filter('momentFmt', function() {
    return function(input, fmt) {
      return input ? input.format(fmt) : '';
    };
  })
  .filter('momentDiff', function() {
    return function(finish_time, start_time) {
      if (finish_time) {
        return moment.duration(
          finish_time.diff(start_time ? start_time : moment()), 'milliseconds').humanize();
      }
      return '';
    };
  })
  .filter('momentAdd', function() {
    return function(time, duration, unit) {
      if (time) {
        return moment(time).add(duration, unit);
      }
    };
  })
  .filter('momentHumanize', function() {
    return function(duration: number, unit?: string, suffix?: boolean) {
      return moment.duration(duration, unit).humanize(suffix);
    };
  })
  .filter('durationFmt', function() {
    return function(duration, unit) {
      if (duration) {
        var dur = moment.duration(duration, unit || "minutes");
        var hours = Math.floor(dur.asHours());
        var minutes = dur.minutes();
        return hours + ":" + ("0" + minutes).slice(-2);
      }
      return "";
    };
  })
  .filter('momentCalendar', function() {
    return function(date) {
      return date ? date.calendar() : '';
    };
  })
  .filter('apiDateShow', function(kinDateTimeUtil) {
    // take API formatted string and present it in human-friendly form
    return function(api_date) {
      if (!api_date) {
        return '';
      }
      return kinDateTimeUtil.parseApiDateTime(api_date)
        .format(kinDateTimeUtil.fmt.uiDate);
    }
  })
  .filter('apiTimeShow', function(kinDateTimeUtil) {
    // take API formatted string and present it in human-friendly form
    return function(api_date) {
      if (!api_date) {
        return '';
      }
      return kinDateTimeUtil.parseApiDateTime(api_date)
        .format(kinDateTimeUtil.fmt.uiTime);
    }
  });
}
