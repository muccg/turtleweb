module Search {
  'use strict';

  /*
   * The ApiSearchExpr is a search expr from the query parser which
   * has been munged into the format which the API understands.
   *
   * ApiSearchField values are specific to the resource and depend on
   * its keyword definitions.
   */

  export type ApiSearchExpr = string | ApiSearchAnd | ApiSearchOr | ApiSearchNot | ApiSearchField;
  export interface ApiSearchAnd {
    and: ApiSearchExpr[];
  }
  export interface ApiSearchOr {
    or: ApiSearchExpr[];
  }
  export interface ApiSearchNot {
    not: ApiSearchExpr;
  }
  export type ApiSearchFieldValue = string | number | boolean | IsoDateRange;
  export interface ApiSearchField {
    name: string[];
    value: ApiSearchFieldValue;
    exact?: boolean;
  }

  export interface IsoDateRange {
    start?: string;
    end?: string
  }

  export interface FieldToApi {
    (name: string[], value: string): ApiSearchFieldValue;
  }

  export interface FieldFromApi {
    (name: string[], value: ApiSearchFieldValue): string;
  }

  import B = BaseParser;

  export function exprToApi(expr: B.SearchQuery, fieldToApi: FieldToApi): ApiSearchExpr {
    var andexpr = <B.SearchQueryAnd>expr;
    var orexpr = <B.SearchQueryOr>expr;
    var notexpr = <B.SearchQueryNot>expr;
    var fexpr = <B.SearchQueryField>expr;

    if (typeof expr === "string") {
      return expr;
    } else if (expr === null) {
      return null;
    } else if (andexpr.and) {
      return { and: _.map(andexpr.and, (term) => {
        return exprToApi(term, fieldToApi);
      }) };
    } else if (orexpr.or) {
      return { or: _.map(orexpr.or, (term) => {
        return exprToApi(term, fieldToApi);
      }) };
    } else if (notexpr.not) {
      return { not: exprToApi(notexpr.not, fieldToApi) };
    } else if (fexpr.name) {
      return {
        name: fexpr.name,
        value: fieldToApi(fexpr.name, fexpr.value),
        exact: fexpr.exact
      }
    } else {
      return null;
    }
  }

  export function exprFromApi(expr: ApiSearchExpr, fieldFromApi: FieldFromApi): B.SearchQuery {
    var andexpr = <ApiSearchAnd>expr;
    var orexpr = <ApiSearchOr>expr;
    var notexpr = <ApiSearchNot>expr;
    var fexpr = <ApiSearchField>expr;

    if (typeof expr === "string") {
      return expr;
    } else if (_.isEmpty(expr)) {
      return null;
    } else if (andexpr.and) {
      return { and: _.map(andexpr.and, (term) => {
        return exprFromApi(term, fieldFromApi);
      }) };
    } else if (orexpr.or) {
      return { or: _.map(orexpr.or, (term) => {
        return exprFromApi(term, fieldFromApi);
      }) };
    } else if (notexpr.not) {
      return { not: exprFromApi(notexpr.not, fieldFromApi) };
    } else if (fexpr.name) {
      return {
        name: fexpr.name,
        value: fieldFromApi(fexpr.name, fexpr.value),
        exact: fexpr.exact
      };
    } else {
      return null;
    }
  }
}
