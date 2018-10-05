module kindred {
  'use strict';

  export interface AnnEventType extends Models.EventType {
    parent: AnnEventType;
    children?: AnnEventType[];
    depth: number;
  }

  export interface AnnotateTree {
    items: AnnEventType[];
    map: {
      [index: string]: AnnEventType;
    }
  }

  export class EventTypesService {
    private ets: Models.EventType[];
    /** maps resource_uri to EventType */
    private etsMap: {
      [index: string]: Models.EventType;
    };
    /** maps id to EventType */
    private etsMapId: {
      [index: number]: Models.EventType;
    };
    private promise: angular.IPromise<Models.EventType[]>;

    // @ngInject
    constructor(private Restangular: restangular.IService,
                private kinSchemaUtil: SchemaUtilService) {
      this.promise = this.loadEventTypes();
    }

    annotateTree(items: Models.EventType[], field: string, parentAttr?: string, depthAttr?: string): AnnotateTree {
      var map = _.keyBy(<AnnEventType[]>items, "resource_uri");
      var sorted: AnnEventType[] = [];

      depthAttr = depthAttr || "depth";
      parentAttr = parentAttr || "parent";

      var setDepth = function(et, depth) {
        et[depthAttr] = depth;
        _.each(et.children, function(c) {
          setDepth(c, depth + 1);
        });
      };

      var addItemToList = function(et) {
        sorted.push(et);
        _.each(et.children, addItemToList);
      };

      _(items)
        .sortBy("order")
        .map(et => _.assign(et, { children: [] }))
        .map(et => {
          // init child type list
          et[parentAttr] = map[et[field]];
          if (et[parentAttr]) {
            et[parentAttr].children.push(et);
          } else {
            et[depthAttr] = 0; // mark root nodes
          }
          return et;
        })
        .map(et => {
          // traverse and set nesting depth of each type
          if (et[depthAttr] === 0) {
            setDepth(et, 0);
          }
          return et;
        })
        .map(et => {
          // topo sort starting from root types
          if (et[depthAttr] === 0) {
            addItemToList(et);
          }
          return et;
        })
        .forEach(et => {
          // erase children lists to make structure acyclic
          delete et.children;
        });

      return {
        items: sorted,
        map: map
      };
    }

    unannotateTree(items: AnnEventType[], parentField: string, parentAttr: string, depthAttr: string) {
      var idField = "resource_uri";
      var prev = null;
      var parents = [];

      parentAttr = parentAttr || "parent";
      depthAttr = depthAttr || "depth";

      // fixme: doesn't quite work for double-nested items
      return _(items).map(item => {
        if (prev === null) {
          item[parentField] = null;
        } else {
          if (item[depthAttr] === prev[depthAttr]) {
            item[parentField] = prev[parentField];
          } else if (item[depthAttr] > prev[depthAttr]) {
            item[parentField] = prev[idField];
            parents.push(prev[parentField]);
          } else {
            item[parentField] = parents.pop() || null;
          }
        }
        return (prev = item);
      }).forEach(item => {
        delete item[parentAttr];
        delete item[depthAttr];
      });
    }

    private loadEventTypes() {
      this.ets = [];

      return this.Restangular.all("eventtype").getList({limit: 0})
        .then((eventTypes) => {
          // arrange event types in a tree based on super-type
          var t = this.annotateTree(eventTypes, "super_type", "parent", "depth");
          this.etsMap = t.map;
          this.etsMapId = <any>_.keyBy(_.values(this.etsMap), "id");
          _.forEach(t.items, item => this.ets.push(item));
          return this.ets;
        });
    }

    // kinda-synchronous version -- empty array is filled once loaded
    get() {
      return this.ets;
    }

    // async version -- returns promise to event types, possibly filtered by study
    load(study?: Models.Study): angular.IPromise<Models.EventType[]> {
      if (study) {
        return this.promise.then(eventTypes => {
          return _.filter(eventTypes, et => this.isApplicable(study, et));
        });
      } else {
        return this.promise;
      }
    }

    /**
     * Returns whether an event type applies to the given study
     */
    isApplicable(study: Models.Study, et: Models.EventType) {
      return !study || _.isEmpty(et.studies) ||
        _.includes(et.studies, study.resource_uri);
    }

    translateSchema(schema: Models.CustomSchema, patientCases?: GenModels.patientcase_uri[]): PlainField[] {
      var fields: PlainField[] = [];

      var translate = schema => {
        if (schema) {
          var isVisible = propName => {
            var hiding = schema.caseHiding ? schema.caseHiding[propName] : [];
            return !patientCases || patientCases.length === 0 ||
              _.intersection(hiding, patientCases).length < patientCases.length;
          };

          _.each(schema.properties, (p: Models.CustomProp, name) => {
            var field = {
              name: name,
              title: this.kinSchemaUtil.makeHeading(name, p),
              description: p.description,
              type: p.type,
              enum: p.enum,
              resource: p.resource, /* for resourceId type */
              required: _.includes(schema.required, name),
              id: "schema-field-" + name,
              // fixme: this will result in mixed-up properties
              order: p.propertyOrder
            };
            if (isVisible(name)) {
              fields.push(field);
            }
          });
        }
      }

      translate(schema);
      return _.sortBy(fields, "order");
    }

    getMergedSchema(eventType: Models.EventType): Models.CustomSchema {
      var schema = {
        type: "object",
        properties: {},
        required: [],
        caseHiding: {}
      };

      var merge = (et) => {
        var parent = this.getParent(et);

        if (parent) {
          merge(parent);
        }

        if (et.fields && _.isObject(et.fields)) {
          _.each(et.fields.properties, function(prop, name) {
            schema.properties[name] = prop;
          });

          _.each(et.fields.required, function(name) {
            schema.required.push(name);
          });

          _.each(et.fields.caseHiding, function(cases, name) {
            if (!schema.caseHiding[name]) {
              schema.caseHiding[name] = [];
            }
            _.each(cases, function(uri) {
              schema.caseHiding[name].push(uri);
            });
          });
        }

        return schema;
      }

      return <any>merge(eventType);
    }

    private getParent(et: Models.EventType): Models.EventType {
      return (et && et.super_type) ? this.etsMap[<string>et.super_type] : undefined;
    }

    getParentFields(eventType: Models.EventType): PlainField[] {
      var parent = this.getParent(eventType);
      return parent ? this.translateSchema(this.getMergedSchema(parent)) : null;
    }

    refresh() {
      return (this.promise = this.loadEventTypes());
    }

    getById(id: number) {
      return this.etsMapId[id];
    }
  }

  angular.module("kindred.event", [])
    .service('kinEventTypes', EventTypesService);
}
