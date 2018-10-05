// this is a global declared by parser.jison
declare var parser: BaseParser.GenSearchParser;

module BaseParser {
  'use strict';

  export type SearchQuery = string | SearchQueryAnd | SearchQueryOr | SearchQueryNot | SearchQueryField;
  export interface SearchQueryAnd {
    and: SearchQuery[];
  }
  export interface SearchQueryOr {
    or: SearchQuery[];
  }
  export interface SearchQueryNot {
    not: SearchQuery;
  }
  export interface SearchQueryField {
    name: string[];
    value: string;
    exact?: boolean;
  }

  ////////////////////////////////////////////////////////////////////////

  export interface LexErrorHash {
    text: string;
    token: string;
    line: number;
  }
  export interface ParseErrorHash extends LexErrorHash {
    loc: any;
    expected: string[];
    recoverable: boolean;
  }

  export class GenParseError {
    public name = "GenParseError";
    constructor(public message: string, public hash: ParseErrorHash) {
    }
  }

  export class GenLexError {
    public name = "GenLexError";
    constructor(public message: string, public hash: LexErrorHash) {
    }
  }

  export interface ParseErrorCallback {
    (str: string, hash: LexErrorHash|ParseErrorHash): void;
  }

  export interface GenSearchParser {
    parse(text: string): SearchQuery;
    lexer: {
      lex(): string|number;
      setInput(string): void;
      yytext: string;
    };
    yy: {
      parseError: ParseErrorCallback;
    };
    terminals_: {
      [index: number]: string;
    };
  }

  ////////////////////////////////////////////////////////////////////////

  export interface ParseResult {
    success: boolean;
    query?: SearchQuery;
    error?: GenParseError|GenLexError;
  }

  export interface ExpectedInfo {
    token: string;
    tokens: {
      name: string;
      symbol: number|string;
      value: string;
    }[];
    expected: string[];
    got?: string;
  }

  export interface LexToken {
    name: string;
    symbol: number;
    value: string;
  }

  export class BaseSearchParserService {
    public static $inject = ["genSearchParser"];
    constructor(private parser: GenSearchParser) {
      this.parser.yy.parseError = this.parseError;
    }

    parse(text: string): SearchQuery {
      return text ? this.parser.parse(text.replace(/\n+/, "\n") + "\n\n")[0] : null;
    }

    maybeParse(text: string): ParseResult {
      try {
        return {
          success: true,
          query: this.parse(text)
        };
      } catch (e) {
        return {
          success: false,
          error: e
        };
      }
    }

    private parseError(str: string, hash: LexErrorHash|ParseErrorHash): void {
      if (hash.token) {
        throw new GenParseError(str, <ParseErrorHash>hash);
      } else {
        throw new GenLexError(str, <LexErrorHash>hash);
      }
    }

    isValid(text: string): boolean {
      return this.maybeParse(text).success;
    }

    getExpected(text: string, pos: number): ExpectedInfo {
      var stripQuotes = function(tok: string): string {
        if (tok[0] === "'" && tok[tok.length - 1] === "'") {
          return tok.slice(1, -1);
        } else {
          return tok;
        }
      };

      var cleanup = function(expected: string[]): string[] {
        expected = _.map(expected, stripQuotes);
        return expected;
      };

      try {
        var tokens = this.lex(text.slice(0, pos)).reverse();
        this.parser.parse(text.slice(0, pos).replace(/\n+/, "\n"));
        return { token: "", tokens: tokens, expected: [] };
      } catch (e) {
        if (e.hash && e.hash.token) { // && e.hash.token === "EOF") {
          return {
            token: tokens.length ? tokens[0].value : "",
            tokens: tokens,
            expected: cleanup(e.hash.expected),
            got: e.hash.token
          };
        } else {
          return {
            token: null,
            tokens: [],
            expected: []
          }
        }
      }
    }

    getLastToken(text: string): string {
      var tokens = this.lex(text);
      return tokens[tokens.length - 1].value;
    }

    lex(text: string): LexToken[] {
      var lex = () => {
        var symbol = this.parser.lexer.lex();
        return {
          symbol: symbol,
          name: typeof symbol === "number" ? this.parser.terminals_[symbol] : symbol,
          value: this.parser.lexer.yytext
        };
      };

      var tokens = [], token;

      this.parser.lexer.setInput(text);
      while ((token = lex()).value) {
        tokens.push(token);
      }
      return tokens;
    }
  }

  angular.module("kindred.search.parser", [])
    .factory("genSearchParser", () => parser)
    .service("baseSearchParser", BaseSearchParserService);
}
