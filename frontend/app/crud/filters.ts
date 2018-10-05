module kindred {
  'use strict';

  function listItemCountFilter() {
    return function(list) {
      if (list && list.metadata) {
        return Math.min(list.metadata.limit, list.metadata.total_count) +
          "/" + list.metadata.total_count;
      }
    };
  }

  angular.module("kindred.crud.filters", [])
    .filter('listItemCount', listItemCountFilter);
}
