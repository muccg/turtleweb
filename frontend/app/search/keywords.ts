module SearchKeywords {
  'use strict';

  /*
   * Keyword definitions define the format of values in field:value terms.
   */

  export type Keyword = BaseKeyword | KeywordString | KeywordResource | KeywordRelated;

  export interface BaseKeyword {
    name: string;
    title?: string;
    type?: string;
    typeDesc?: string;
    attr?: string;
    hidden?: boolean;
    group?: KeywordGroup;
    order?: number;
  }

  export interface KeywordString extends BaseKeyword {
    regexp?: RegExp;
    enum?: string[];
  }

  export interface KeywordResource extends BaseKeyword {
    resource?: string;
    attr?: string;
    titleAttr?: string;
    limitStudy?: string;
  }

  export interface KeywordSearch extends BaseKeyword {
    resource?: string;
  }

  export interface KeywordRelated extends BaseKeyword {
    relatedTo?: string;
    // fixme: shouldn't be doing tree thing here
    sub?: Keyword[];
  }

  export type KeywordGroupId = string;
  export type KeywordGroup = {
    id: KeywordGroupId;
    title: string;
    group?: KeywordGroupId;
    order: number;
  };

  /*
   * This list of keywords reflects what built-in fields the API query
   * builder supports.
   */

  export interface AllKeywords {
    person: Keyword[];
    event: Keyword[];
    sample: Keyword[];
    user: Keyword[];
  }

  var allKeywords: AllKeywords = {
    person: [{
      name: "id",
      title: "Patient ID",
      type: "string",
      regexp: /((P-)?\d+)/i,
      typeDesc: "Patient ID number or P-000000"
    }, {
      name: "pk",
      title: "Primary Key",
      type: "number",
      hidden: true
    }, {
      name: "given",
      title: "Given names",
      type: "string"
    }, {
      name: "surname",
      type: "string"
    }, {
      name: "alias",
      title: "Alias",
      type: "string"
    }, {
      name: "name",
      title: "Any name",
      type: "string",
      hidden: true
    }, {
      name: "study",
      title: "Other studies",
      type: "resourceId",
      resource: "study",
      attr: "slug",
      titleAttr: "name"
    }, {
      name: "case",
      title: "Patient Case",
      type: "resourceId",
      resource: "patientcase",
      limitStudy: "study"
    }, {
      name: "sex",
      regexp: /(M(ale)?|F(emale)?|U(nknown)?)/i,
      enum: ["M", "F", "U"]
    }, {
      name: "dob",
      title: "Birth date",
      type: "date"
    }, {
      name: "dod",
      title: "Death date",
      type: "date"
    }, {
      name: "deceased",
      type: "boolean"
    }, {
      name: "cod",
      title: "Cause of death",
      type: "string"
    }, {
      name: "consent",
      title: "Consent status",
      type: "resourceId",
      resource: "consentstatus"
    }, {
      name: "consent_date",
      title: "Consent date",
      type: "date"
    }, {
      name: "group",
      title: "Study group",
      type: "resourceId",
      resource: "studygroup"
    }, {
      name: "search",
      title: "Saved search",
      type: "search"
    }, {
      name: "event",
      title: "Has event",
      type: "related",
      relatedTo: "event"
    }],

    event: [{
      name: "id",
      title: "Event ID",
      type: "string",
      //pattern: "E-012345",
      regexp: /((E-)?\d+)/i,
      typeDesc: "Event ID number or E-000000"
    }, {
      name: "pk",
      title: "Primary Key",
      type: "number",
      hidden: true
    }, {
      name: "type",
      type: "resourceId",
      resource: "eventtype"
    }, {
      name: "date",
      type: "date"
    }, {
      name: "study",
      type: "resourceId",
      resource: "study"
    }, {
      name: "search",
      title: "Saved search",
      type: "search"
    }, {
      name: "sample",
      title: "Has sample",
      type: "related",
      relatedTo: "sample"
    }, {
      name: "patient",
      type: "related",
      relatedTo: "person"
    }],

    sample: [{
      name: "id",
      title: "Specimen ID",
      type: "string",
      regexp: /((B-)?\d+)/i
    }, {
      name: "pk",
      title: "Primary Key",
      type: "number",
      hidden: true
    }, {
      name: "study",
      type: "resourceId",
      resource: "study",
      attr: "slug",
      titleAttr: "name"
    }, {
      name: "type",
      type: "resourceId",
      resource: "sampleclass",
      titleAttr: "name"
    }, {
      name: "subtype",
      title: "Sub-type",
      type: "resourceId",
      resource: "samplesubtype"
    }, {
      name: "stored_in",
      title: "Stored In",
      type: "resourceId",
      resource: "samplestoredin"
    }, {
      name: "treatment",
      type: "resourceId",
      resource: "sampletreatment"
    }, {
      name: "behaviour",
      type: "resourceId",
      resource: "samplebehaviour"
    }, {
      name: "dna_extraction_protocol",
      type: "resourceId",
      resource: "dnaextractionprotocol"
    }, {
      name: "collected",
      type: "date"
    }, {
      name: "processed",
      type: "date"
    }, {
      name: "frozenfixed",
      type: "date"
    }, {
      name: "owner",
      type: "related",
      relatedTo: "person"
    }, {
      name: "event",
      type: "related",
      relatedTo: "event"
    }, {
      name: "search",
      title: "Saved search",
      type: "search"
    }],

    user: [{
      name: "email",
      type: "string"
    }, {
      name: "id",
      type: "number"
    }, {
      name: "active",
      type: "boolean"
    }, {
      name: "role",
      title: "Has Role",
      type: "string",
      enum: ["Administrator", "User Manager", "Data Analyst", "Curator", "User"]
    }]
  };

  export function findKeyword(keywords: AllKeywords, name: string[], resource: string): Keyword {
    function find(names: string[], resource: string): Keyword {
      var name = names.pop();
      var keyword = <Keyword>_.find(keywords[resource], { name: name });
      if (keyword && keyword.type === "related") {
        var k = <KeywordRelated>keyword;
        return names.length ? find(names, k.relatedTo) : k;
      } else {
        return keyword;
      }
    }
    return find(angular.copy(name).reverse(), resource);
  };


  interface ModelDataSchema {
    // mapping from model name to schemas
    [index: string]: Models.CustomDataSchema[];
  }
  export interface QueryKeywordsPromise extends ng.IPromise<AllKeywords> {
    $object: AllKeywords;
  }

  /**
   * This service combines the static list of search keywords (which
   * reflect what keywords the API supports) with the search keywords
   * defined by the user.
   *
   * The user defines search keywords simply by creating a field on an
   * event type or adding a field to the custom data schema of a model.
   */
  export class QueryKeywordsService {
    private promise: {
      [index: string]: QueryKeywordsPromise;
    };
    private disableCache = true;

    // @ngInject
    constructor(private kinEventTypes: kindred.EventTypesService,
                private kinCustomDataSchema: kindred.CustomDataSchemaService,
                private $q: ng.IQService) {
      this.promise = {};
    }

    public getAsync(study?: Models.Study): AllKeywords {
      return this.get(study).$object;
    }

    public get(study?: Models.Study): QueryKeywordsPromise {
      var key = study ? study.resource_uri : "";
      if (this.disableCache || !this.promise[key]) {
        this.promise[key] = this.startLoad(study);
      }
      return this.promise[key];
    }

    private sortKeywords(keywords) {
      // fixme: maybe needs some sorting?
      return keywords;
    }

    private startLoad(study?): QueryKeywordsPromise {
      var keywords = angular.copy(allKeywords);
      var promise: QueryKeywordsPromise = <any>this.$q.all([
        this.loadEventTypes(keywords, study),
        this.loadCustomDataSchemas(keywords, study)
      ]).then(r => this.sortKeywords(keywords));
      promise.$object = keywords;
      return promise;
    }

    private loadEventTypes(keywords: AllKeywords, study): ng.IPromise<AllKeywords> {
      return this.kinEventTypes.load(study)
        .then(eventTypes => this.processEventTypes(eventTypes, keywords))
        .then(k => this.sortKeywords(k));
    }

    private processEventTypes(eventTypes: Models.EventType[], keywords: AllKeywords) {
      return _.reduce(eventTypes, (result, et: Models.EventType) => {
        var group: KeywordGroup = {
          id: <string>et.resource_uri,
          group: <string>et.super_type,
          title: et.name,
          order: et.order
        };

        if (et.fields && et.fields.properties) {
          // fixme: sort by property order
          // or maybe do the sorting in the autocomplete menu
          _.each(et.fields.properties, (prop, name: string) => {
            var keyword = this.translate(name, prop);
            keyword.group = group;
            result.event.push(keyword);
          });
        }
        return result;
      }, keywords);
    }

    private translate(name: string, prop: Models.CustomProp): Keyword {
      return <Keyword>_.assign({ name: name }, prop);
    }

    private loadCustomDataSchemas(keywords: AllKeywords, study?): ng.IPromise<AllKeywords> {
      return this.kinCustomDataSchema.getForStudy(study)
        .then(cds => this.processCustomDataSchema(cds, keywords))
        .then(k => this.sortKeywords(k));
    }

    private processCustomDataSchema(cds, keywords: AllKeywords): AllKeywords {
      return _(cds)
        .mapValues((ss: Models.CustomDataSchema[]) => this.translateSchemaKeywords(ss))
        .reduce((result: AllKeywords, ks: Keyword[], resource: string) => {
          if (result[resource]) {
            _.each(ks, keyword => result[resource].push(keyword));
          }
          return result;
        }, keywords);
    }

    private translateSchemaKeywords(ss: Models.CustomDataSchema[]): Keyword[] {
      return _.map(this.mergeSchema(ss), (prop, name) => this.translate(name, prop));
    }

    private mergeSchema(ss: Models.CustomDataSchema[]): Models.CustomProperties {
      return _.reduce(ss, (result, s) => {
        return _.reduce(s.schema.properties, (result, prop, name) => {
          if (!result[name]) {
            result[name] = <Models.CustomProp>prop;
          }
          return result;
        }, result);
      }, <Models.CustomProperties>{});
    }
  }
}
