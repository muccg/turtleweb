/// <reference path="services.ts" />
/// <reference path="controllers.ts" />
/// <reference path="filters.ts" />
/// <reference path="index.run.ts" />
/// <reference path="models.ts" />

module kindred {
  'use strict';

  /**
   * Value is a promise ... perhaps.
   */
  export type PromisePerhaps<T> = T | ng.IPromise<T>;

  /**
   * A promise with empty value ready to watch now.
   */
  export interface PromiseNow<T> extends ng.IPromise<T> {
    $object: T;
  }

  angular.module("kindred.crud", [
    "kindred.crud.services",
    "kindred.crud.controllers",
    "kindred.crud.directives",
    "kindred.crud.filters",
    "kindred.crud.ddl",
    "kindred.crud.run"
  ]);
}
