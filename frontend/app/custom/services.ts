module kindred {
  'use strict';

  /**
   * This is a json schema property converted into an array entry for
   * use by schema editing directives. fixme: change the name
   * see EventTypesService.translateSchema()
   */
  export interface PlainField extends Models.CustomProp {
    name: string;
  }

  type StudyUri = GenModels.study_uri;
  export type ContentTypeName = string;
  export interface ContentType {
    app_label: string;
    model: string;
  };
  var contentTypeName = c => c.app_label + "_" + c.model;

  export class CustomDataSchemaService {
    private schemaResource: restangular.IElement;
    private promise: ng.IPromise<restangular.ICollection>;
    private schemas: Models.CustomDataSchema[];
    private schemaContentType: {
      [index: string /*ContentTypeName*/]: {
        [index: string /*StudyUri*/]: Models.CustomDataSchema;
      };
    };
    // mapping resource name -> applabel_modelname
    private resourceMapping: { [index: string]: string; };
    // mapping applabel_modelname -> resource name
    private contentTypeMapping: { [index: string]: string; };

    // temporary
    public models: {
      resource: string;
      content_type: ContentType;
      schemas: {
        [index: string /*StudyUri*/]: Models.CustomDataSchema;
      };
    }[];

    // @ngInject
    constructor(private Restangular: restangular.IService) {
      this.schemaResource = Restangular.all("customdataschema");
    }

    all(): ng.IPromise<restangular.ICollection> {
      if (!this.promise) {
        this.promise = this.schemaResource.getList({ limit: 0 })
          .then((schemas: Models.CustomDataSchema[]) => {
            this.updateList(schemas);
            return schemas;
          });
      }

      return this.promise;
    }

    private updateList(schemas: Models.CustomDataSchema[]) {
      // fixme: do schema merging
      this.schemas = schemas;
      this.schemaContentType = _(schemas)
        .groupBy(s => contentTypeName(s.content_type))
        .mapValues((ss: Models.CustomDataSchema[]) => _.keyBy(ss, s => s.study || ""))
        .value();
      this.resourceMapping = <any>_.fromPairs(
        _(schemas)
          .map(s => s.content_type)
          .map(ct => [ct.model, contentTypeName(ct)])
          .valueOf());
      this.contentTypeMapping = <any>_.invert(this.resourceMapping);
      this.models = _.map(this.schemaContentType, (x, n) => {
        var ct = _.sample(x).content_type;
        return {
          resource: this.contentTypeMapping[n],
          content_type: ct,
          schemas: x
        };
      });
    }

    get(resource: string, studyUri = ""): ng.IPromise<Models.CustomDataSchema> {
      return this.all().then(schema => {
        var sct = this.schemaContentType[this.resourceMapping[resource]];
        return sct ? (sct[studyUri] || sct[""]) : undefined;
      });
    }

    getForContentType(contentType: ContentTypeName): ng.IPromise<Models.CustomDataSchema> {
      return this.all().then(schemas => {
        var sct = this.schemaContentType[contentType];
        return sct ? sct[""] : undefined;
      });
    }

    // maps resource names to schema(s) applying to the given study
    getForStudy(study?: Models.Study): ng.IPromise<{ [index:string]: Models.CustomDataSchema[] }> {
      return this.all().then(schemas => {
        return _(schemas)
          .filter(s => !s.study || s.study === study.resource_uri)
          .sortBy(s => s.study)
          .groupBy(s => this.contentTypeMapping[contentTypeName(s.content_type)])
          .value();
      });
    }

    refresh() {
      this.promise = null;
      return this.all();
    }
  }

  export class SchemaUtilService {
    private capitalize: (value: string) => string;

    // @ngInject
    constructor($filter: ng.IFilterService) {
      this.capitalize = $filter<{(value: string): string}>("capitalize");
    }

    listColumnsFromCDS(cds: Models.CustomDataSchema) {
      return this.listColumnsFromSchema(cds.schema);
    }

    /**
     * Returns an array of column descriptions which could be used in
     * a list view.
     */
    listColumnsFromSchema(schema: Models.CustomSchema) {
      return schema ? _.map(schema.properties, (prop, name) => {
        return {
          heading: this.makeHeading(name, prop),
          field: name,
          prop: prop
        };
      }) : [];
    }

    /**
     * Returns a heading for a schema property suitable for showing in
     * the frontend.
     */
    makeHeading(name: string, prop: Models.CustomProp): string {
      return prop.title || this.makeTitle(name);
    }

    /**
     * Simple formula for renaming attribute names into titles.
     */
    makeTitle(name) {
      return this.capitalize(name).replace(/[-_]/g, " ");
    }
  }

  angular.module("kindred.custom.services", [])
    .service('kinCustomDataSchema', CustomDataSchemaService)
    .service('kinSchemaUtil', SchemaUtilService);
}
