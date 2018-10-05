module kindred {
  'use strict';

  import K = SearchKeywords;

  export class SearchAutoComplete {
    // @ngInject
    constructor(kinQueryKeywords: K.QueryKeywordsService,
                private kinQuery: SearchQueryCtrl,
                study: Models.Study) {
      this.allKeywords = kinQueryKeywords.getAsync(study);

      this.level = {
        keyword: null,
        value: null,
        keywordRelated: null,
        wantSpace: false
      };
    }

    show: boolean;
    focus: boolean;

    pos: {
      top: number;
      left: number
    }

    expected: BaseParser.ExpectedInfo;
    current: string;
    expectedExpr: {
      and: boolean;
      or: boolean;
      not: boolean;
      brackets: boolean;
    };

    level: {
      keyword: { current: string; };
      value: { current: string; keyword?: K.Keyword };
      keywordRelated: { current: string; keyword?: K.Keyword };
      wantSpace: boolean;
    };

    allKeywords: K.AllKeywords;
    keywords: K.Keyword[];
    possibleKeywords: K.Keyword[];
    prevKeyword: K.Keyword;

    updatePossible() {
      this.keywords = this.allKeywords[this.kinQuery.resource];

      var expected = this.expected.expected;

      var set = _.zipObject(expected);
      this.expectedExpr = {
        and: "AND" in set,
        or: "OR" in set,
        not: "NOT" in set,
        brackets: "(" in set
      };

      this.current = this.expected.token === " " ? "" : this.expected.token;

      var isWeird = function(items: string[]) {
        // fixme: why those expected states?
        var weird = ["SP", "NEWLINE", ")"];
        return items.length === weird.length &&
          _.intersection(items, weird).length === weird.length;
      };

      var toks = this.expected.tokens;

      this.level.keyword = null;
      this.level.value =  null;
      this.level.keywordRelated = null;
      this.level.wantSpace = false;

      var lookBackName = (toks: any[], ignore?: string): string[] => {
        var isIgnored = tok => ignore && tok.name === ignore;
        return _(toks)
          .takeWhile(tok => tok.name === "FIELDNAME" ||
                     tok.name === "FIELDNAMEPART" ||
                     isIgnored(tok))
          .filter(tok => !isIgnored(tok))
          .map(tok => tok.value.slice(0, -1))
          .reverse()
          .valueOf();
      };

      var findKeyword = (name: string[]): K.Keyword => {
        return K.findKeyword(this.allKeywords, name, this.kinQuery.resource);
      };

      if (_.has(set, "AC_FIELDVALUE") ||
          (toks && toks[0] && toks[0].name === "SEARCHTERM" && toks[1] && toks[1].name === "FIELDNAME")) {
        // field value
        var fieldname = lookBackName(toks, "SEARCHTERM");
        this.level.value = {
          current: _.includes(["QUOTED", "NUMBER", "SEARCHTERM"], toks[0].name) ? toks[0].value : "",
          keyword: findKeyword(fieldname)
        };
      } else if (_.has(set, "AC_FIELDPARTS")) {
        // part of field name
        var fieldnameparts = lookBackName(toks, "SEARCHTERM");
        this.level.keywordRelated = {
          current: toks[0].name === "SEARCHTERM" ? toks[0].value : "",
          keyword: findKeyword(fieldnameparts)
        };
        var keywords = this.getRelatedKeywords(this.level.keywordRelated.keyword);
        this.possibleKeywords = _.filter(keywords, k => {
          return !this.level.keywordRelated.current ||
            k.name.indexOf(this.level.keywordRelated.current.toLowerCase()) === 0;
        });
        this.prevKeyword = this.level.keywordRelated.keyword;
      } else if (_.isEmpty(expected) || _.has(set, "AC_FIELD") ||
                 (!_.has(set, "AC_FIELDPARTS") && toks[0].name === "SEARCHTERM")) {
        // field name
        this.level.keyword = { current: toks[0] && toks[0].name === "SEARCHTERM" ? toks[0].value : "" }
        this.possibleKeywords = _.filter(this.keywords, k => {
          return !this.level.keyword.current || k.name.indexOf(this.level.keyword.current.toLowerCase()) === 0;
        });
      } else if (expected.length === 1 && expected[0] === "SP") {
        this.level.wantSpace = true;
      }
    }

    private getRelatedKeywords(keyword: K.Keyword): K.Keyword[] {
      var keywords = [];
      if (keyword) {
        // fixme: use findKeyword from search.ts
        var related = <K.KeywordRelated>keyword;
        if (related.relatedTo) {
          _.each(this.allKeywords[related.relatedTo], function(k) {
            keywords.push(k);
          });
        }
      }
      return keywords;
    }

    completeKeyword(keyword: K.Keyword): string {
      var sep = keyword.type === "related" ? "." : ":";
      var current = this.expected.tokens[0] ? this.expected.tokens[0].value : "";
      var prefix = current && keyword.name.slice(0, current.length) === current;
      return (prefix ? keyword.name.slice(current.length) : keyword.name) + sep;
    }

    completeValue(value: string): {add: string; remove: number;} {
      var maybeQuote = function(text) {
        if (text) {
          return text.indexOf(" ") < 0 ? text : ('"' + text + '"');
        } else {
          return "";
        }
      };

      var current = this.expected.tokens[0] ? this.expected.tokens[0].value : "";
      var prefix = current && value.slice(0, current.length).toLowerCase() === current.toLowerCase();
      return {
        add: maybeQuote(value),
        remove: prefix ? current.length : 0
      };
    }

    hide() {
      this.show = false;
    }
  }

  export interface QueryAutoCompletePosCallback {
    (show: boolean, focus: boolean, pos: { top: number, left: number }): void;
  }

  export class QueryAutoCompletePosService {
    // @ngInject
    constructor(private $document: ng.IDocumentService) {
    }

    /*
     * This registers a callback to receive advice about where to put
     * the autocomplete menu. The elem should be a text input.
     *
     * The menu should appear when elem is focussed and disappear when
     * blurred.
     *
     * Except that on the first focus the menu shouldn't appear until
     * the elem is re-focussed or the user clicks or types into the
     * elem.
     *
     * Pressing ESC will make the menu disappear.
     */
    listen(elem: ng.IAugmentedJQuery, callback: QueryAutoCompletePosCallback) {
      var inited = false;
      elem.on("focus blur click keyup", ev => {
        var show = !elem.attr("readonly");
        var focus = ev.type !== "blur";
        var cancel = ev.type === "keyup" && ev.keyCode === 27;
        var acMenu = this.$document.find(".kin-query-auto-complete");
        var menuFocus = ev.relatedTarget && acMenu.find(ev.relatedTarget).length;
        var pos = elem.offset();
        var height = elem.outerHeight();
        callback(show && inited && !cancel,
                 focus || !!menuFocus,
                 { top: pos.top + height, left: pos.left });
        inited = inited || focus;
      });
    }
  }
}
