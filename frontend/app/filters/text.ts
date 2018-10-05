module kindred {
  'use strict';

  var m = angular.module("kindred.filters.text", ["ngSanitize"])
  m.filter('checkmark', function() {
    return function(input) {
      return input ? '\u2713' : '\u2718';
    };
  });

  m.filter('titleCase', function() {
    var cap_word = function(word) {
      if (word && word[0].toLocaleUpperCase() !== word[0]) {
        word = word[0].toLocaleUpperCase() + word.substring(1);
      }
      return word;
    };

    return function(text) {
      return text ? _(text.split(' ')).map(cap_word).join(' ') : text;
    };
  });

  m.filter('capitalize', function() {
    return function(text) {
      var title = '';
      if (text) {
        title = text.substring(0, 1).toLocaleUpperCase() +
          text.substring(1);
      }
      return title;
    };
  });

  m.filter('join', function() {
    return function(input: string[], sep: string) {
      return input ? _(input).join(sep) : '';
    };
  });

  m.filter('yesno', function() {
     return function(data) {
       if (data) {
         return 'Yes';
       }
       return 'No';
     };
  });

  /* fixme: need to sort out blank/unknown system for bools. */
  m.filter('yesnomaybe', function() {
     return function(data, maybe) {
       if (_.isUndefined(data)) {
         return '';
       } else if (data === null) {
         return maybe || 'Unknown';
       } else if (data) {
         return 'Yes';
       } else {
         return 'No';
       }
     };
  });

  m.filter('capToSpace', function() {
    /* take a capitilised name, eg. ThingOfThings, and turn it into a
     * title case string, eg. "Thing Of Things"
     */
    return function(val) {
      if (!val) {
        return val;
      }
      var r = '';
      for (var i = 0; i < val.length; ++i) {
        var c = val[i];
        if (c.toUpperCase() == c) {
          if (r) {
            r += ' ';
          }
        }
        r += c;
      }
      return r;
    }
  });

  m.filter("fillBlank", function() {
    return function(val, blank) {
      return val || blank || "";
    };
  });

  m.filter("showTextField", function() {
    return function(val) {
      if (!val) {
        return "Not entered";
      } else if (val === "?") {
        return "Unknown";
      } else {
        return val;
      }
    };
  });

  /* Some fields rely on another field to determine "unknown" status.
   * This filter reports "Unknown" if a value is empty and the other
   * field is true.
   */
  m.filter('fieldUnknown', function() {
    return function(val, isUnknown) {
      return !val && isUnknown ? "Unknown" : val;
    };
  });

  /* For showing, user-formatted long text, convert text newlines into
   * linebreaks. */
  // @ngInject
  m.filter("makeParagraphs", function($sanitize: ng.sanitize.ISanitizeService) {
    return function(val) {
      if (_.isString(val)) {
        return $sanitize(val).replace(/&#10;/g, "<br>");
      }
      return val;
    }
  });
}
