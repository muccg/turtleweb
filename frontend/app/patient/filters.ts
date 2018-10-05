module kindred {
  'use strict';

  function padding(padLen) {
    if (padLen > 0) {
      var zeroes = Array(padLen + 1).join("0"); // wtf js
      return function(text) {
        text = zeroes + text;
        return text.substr(text.length - zeroes.length);
      };
    } else {
      return _.identity;
    }
  }

  export interface IdFunc {
    (ob: { id: number }): string;
  }

  function idFunc(idField: string, code: string, padLen: number): IdFunc {
    var pad = padding(padLen);
    var fmtId = function(id) {
      return angular.isDefined(id) && id !== null ? code + "-" + pad(id) : "";
    };
    return function(ob) {
      return ob ? (ob[idField] || fmtId(ob.id)) : "";
    };
  }

  export class FilterUtil {
    patientId = idFunc("patient_id", "P", 6);
    sampleId = idFunc("specimen_id", "B", 7);
    eventId = idFunc("ident", "E", 6);
  }

  // @ngInject
  function patientIdFilter(kinFilterUtil: FilterUtil) {
    return kinFilterUtil.patientId;
  }

  // @ngInject
  function eventIdFilter(kinFilterUtil: FilterUtil) {
    return kinFilterUtil.eventId;
  }

  // @ngInject
  function patientIdFullNameFilter(kinFilterUtil, $filter) {
    var name = $filter("personFullName");
    return function(person) {
      if (person) {
        return kinFilterUtil.patientId(person) + " " + name(person);
      }
    };
  }

  // @ngInject
  function consentTextFilter() {
    var texts = {
      notapproached: "Not approached",
      pending: "Consent pending",
      given: "Consent given",
      declined: "Consent declined",
      withdrawn: "Consent withdrawn"
    };
    return function(result) {
      return result ? (texts[result] || "???") : "";
    };
  }

  angular.module("kindred.patient.filters", [])
    .service("kinFilterUtil", FilterUtil)
    .filter("patientId", patientIdFilter)
    .filter("eventId", eventIdFilter)
    .filter("patientIdFullName", patientIdFullNameFilter)
    .filter("kinConsentText", consentTextFilter);
}
