module kindred {
  'use strict';

  var m = angular.module("kindred.filters.misc", [])

  m.filter('objectName', function() {
    return function(item) {
      return item ? item.name : "";
    };
  });

  // Extract a value nested in object item by dotted string, such as
  // status.name
  m.filter('nestedValue', function() {
    return function(object, field) {
      return field.split('.').reduce(function(var1, var2) {
        return (var1 && var2) ? var1[var2] : '' }, object);
    };
  });

  m.filter('verboseName', ['$rootScope', 'Schema', function($rootScope, Schema) {
    return function(resource, field) {
      var resource_schema = Schema.get(resource.route);
      var parent_field;
      if (field.indexOf('.') !== -1) {
        parent_field = field.split('.').reverse()[1];
      } else {
        parent_field = field;
      }
      if (resource_schema.hasOwnProperty('fields')) {
        return resource_schema.fields[parent_field].verbose_name;
      } else {
        return '';
      }
    };
  }]);

  m.filter('choiceLookup', function() {
    /* this takes a value 'val' which is for a particular
     * choices field, and looks it up against the schema
     * and returns the choices value for display
     */
    return function(val, schema, field_name) {
      if (!val) {
        return '';
      }
      if (!schema['fields']) {
        return '';
      }
      if (!schema['fields'][field_name]) {
        return '';
      }
      var field_def = schema['fields'][field_name];
      if (!field_def.choices) {
        return '';
      }
      for (var i = 0; i < field_def.choices.length; ++i) {
        if (field_def.choices[i][0] === val) {
          return field_def.choices[i][1];
        }
      }
      return '';
    }
  });

  m.filter('studyLookup', function(kinStudies) {
    return function(resource_uri, attr) {
      var study = _.find(kinStudies.studies, { resource_uri: resource_uri });
      return study ? study[attr || "name"] : "";
    };
  });
}
