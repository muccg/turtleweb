module kindred {
  'use strict';

  function kinBitbucketIssueLinkDirective() {
    return {
      restrict: 'A',
      link: function(scope, elem, attrs) {
        var issue = /#(\d+)/;
        elem.find("*").each(function() {
          if ($(this).children().length === 0) {
            var text = $(this).text();
            text = text.replace(issue, '<a href="https://github.com/muccg/turtleweb/issues/$1">#$1</a>');
            $(this).html(text);
          }
        });
      }
    };
  }

  function kinTodoButtonDirective() {
    return {
      restrict: 'A',
      link: function(scope, elem, attrs) {
        elem.one("click", function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          elem.addClass("animated hinge");
        });
      }
    };
  }

  angular.module('kindred.components.project', [])
    .directive('kinBitbucketIssueLink', kinBitbucketIssueLinkDirective)
    .directive('kinTodoButton', kinTodoButtonDirective);
}
