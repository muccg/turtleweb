module kindred {
  'use strict';

  const singleHtml = "docs/_single.html";

  // @ngInject
  function docsDirective(kinDocs: DocsService, $window): ng.IDirective {
    return {
      restrict: "E",
      templateUrl: "app/docs/docs.html",
      scope: {
        show: '<',
        onClose: '&'
      },
      link: function(scope: any, elem, attrs) {
        kinDocs.get().then(k => {
          scope.loaded = true;
          elem.find(".docs-container").empty()
            .append(k.doc.clone())
            .find("h1").after(k.toc.clone()).end();
        });

        var w = angular.element($window);
        var resize = () => {
          var winWidth = w.width();
          var help = angular.element(".helpbar");
          var left = winWidth - help.width();
          help.css("left", winWidth >= 768 ? left : 0);
        };
        w.resize(resize);
        resize();
      }
    };
  }

  export class DocsService {
    private getIndex: () => ng.IPromise<string>;
    public toc: any;
    public doc: any;
    //public show: boolean;

    // @ngInject
    constructor($templateRequest: ng.ITemplateRequestService, $templateCache: ng.ITemplateCacheService) {
      this.getIndex = () => $templateRequest(singleHtml);
    }

    get() {
      return this.getIndex().then((html) => {
        var elem = angular.element(html);
        this.doc = this.docCleanup(elem.find(".bodywrapper").contents().detach());
        this.toc = this.tocCleanup(elem.find(".sphinxsidebarwrapper").detach());
        return this;
      })
    }

    private docCleanup(body) {
      return body
        .find("p:contains('Contents:'):first").remove().end()
        .find("img").each((index, elem) => {
          var el = angular.element(elem);
          return el.attr("src", "docs/" + el.attr("src")).attr("style", null);
        }).end();
    }

    private tocCleanup(toc) {
      return toc.find("ul").first()
        .find("a").each((index, elem) => {
          var el = angular.element(elem);
          var href = el.attr("href");
          if (href) {
            el.attr("href", href.replace(/.*#/, "#"));
          }
        }).end();
    }
  }

  export class HelpService {
    show: boolean;

    // @ngInject
    constructor(private $rootScope: ng.IRootScopeService, private $location: ng.ILocationService) {
      $rootScope.$watch(() => $location.search(), search => {
        this.show = search["help"] === "" || !!search["help"];
      });
    }

    toggle(show?: boolean) {
      this.show = angular.isUndefined(show) ? !this.show : show;
      this.$location.search("help", this.show ? "" : null);
    }
  }

  angular.module("kindred.docs", [])
    .service("kinHelp", HelpService)
    .service("kinDocs", DocsService)
    .directive("kinDocs", docsDirective);
}
