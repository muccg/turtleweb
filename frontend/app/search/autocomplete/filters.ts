module kindred {
  'use strict';

  export function highlightFilter() {
    return function(text, highlight) {
      if (text && highlight) {
        var pos = text.toLowerCase().indexOf(highlight.toLowerCase());
        if (pos >= 0) {
          return text.slice(0, pos) + "<strong>" +
            text.slice(pos, pos + highlight.length) +
            "</strong>" + text.slice(pos + highlight.length);
        }
      }
      return text;
    };
  }

  // @ngInject
  export function keywordHtmlFilter($filter) {
    return function(keyword, highlight) {
      return $filter("highlight")(keyword.name, highlight) +
        (keyword.type === 'related' ? '.' : ':') +
        (keyword.title ?
         ('<small>' + keyword.title + '</small>') : '');
    };
  }

  var m = angular.module("kindred.search.autocomplete.filters", [])
    .filter("highlight", highlightFilter)
    .filter("kinKeywordHtml", keywordHtmlFilter);
}
