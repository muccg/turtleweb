module kindred {
  'use strict';

  function sampleId(kinFilterUtil) {
    return function(sample) {
      return kinFilterUtil.sampleId(sample);
    };
  }

  export interface GridIndexFilter {
    (index: number, coord?: string): string;
  }

  export interface GridCoordFilter {
    (loc: Models.SampleLocation, containerClass: Models.ContainerClass): string;
  }

  function containerGridCoord($filter: ng.IFilterService): GridCoordFilter {
    var gridIndex = $filter<GridIndexFilter>("containerGridIndex");
    var isDigit = str => str && !!str.match(/^[0-9]+$/);
    return function(loc, containerClass) {
      if (loc) {
        var dim = containerClass && containerClass.dim ? containerClass.dim : 3;
        var coord = containerClass && containerClass.coord ? containerClass.coord : "111";
        return _([loc.x, loc.y, loc.z])
          .zip(coord.split(""))
          .splice(0, dim)
          .map(([i, c]: [number, string]) => gridIndex(i, c))
          .reverse()
          .reduce((str, coord) => {
            // join adjacent co-ords, use comma if they are same type
            var same = (isDigit(str.slice(-1)) === isDigit(coord));
            var sep = str && same ? ", " : "";
            return str + sep + coord;
          }, "");
      }
    };
  }

  function containerGridIndex(): GridIndexFilter {
    return function(index, coord) {
      if (_.isNumber(index)) {
        if (coord == '1') {
          return "" + (index + 1);
        } else if (coord == 'A') {
          return String.fromCharCode(65 + index);
        } else {
          return "" + index;
        }
      } else {
        return "";
      }
    };
  }

  function sampleLocation(kinContainers: ContainersService, $filter: ng.IFilterService) {
    var gridCoord = $filter<GridCoordFilter>("containerGridCoord");

    var findTrail = function(container) {
      return kinContainers.findContainerTrail(container.resource_uri);
    };

    var getContainer = function(loc) {
      if (loc && loc.container && kinContainers.containerUri) {
        return loc.container.resource_uri ?
          loc.container : kinContainers.containerUri[loc.container];
      } else {
        return null;
      }
    };

    var trailDiff = function(trail, relTrail) {
      var diff = [];
      var prev = null;
      _.each(trail, (cnt: Models.Container, index: number) => {
        if (diff.length || !relTrail[index] || cnt.id !== relTrail[index].id) {
          if (diff.length === 0 && prev) {
            diff.push(prev);
          }
          diff.push(cnt)
          prev = cnt;
        }
      });
      return diff;
    };

    var hasCoord = function(container) {
      return kinContainers.containerProps(container).needsCoord;
    };

    return (loc, cs, rel) => {
      if (loc && cs) {
        var container = getContainer(loc);
        if (container) {
          var trail = findTrail(container);
          var relTrail = rel ? findTrail(getContainer(rel)) : [];
          var diff = trailDiff(trail, relTrail);
          var parts = _.map(diff, "name");
          if (_.isNumber(loc.x) && hasCoord(container)) {
            parts.push(gridCoord(loc, kinContainers.classUri[container.cls]));
          }
          return parts.join(" / ");
        }
      }
    };
  }

  /**
   * Grabs the name of a sample event type from the magic _extra bag.
   */
  // @ngInject
  function sampleEventType(kinEventTypes: EventTypesService) {
    kinEventTypes.load();
    return (item: Models.Sample) => {
      if (item && item._extra) {
        var eventTypeId = item._extra["event_type_id"];
        var eventType = kinEventTypes.getById(eventTypeId);
        return eventType ? eventType.name : "";
      }
    }
  }


  /**
   * Gets the date of the first transaction having the given type.
   */
  function sampleTransactionDate() {
    return (item: Models.Sample, transaction: string) => {
      return _(item.transactions)
        .filter(transaction)
        .map("date")
        .first();
    };
  }

  /**
   * Filter returning the unit of a sample.
   */
  function sampleUnit() {
    return (sample: Models.Sample, def?: string) => {
      if (sample) {
        var cls = <Models.SampleClass>sample.cls;
        return sample.display_unit || (cls ? cls.display_unit : "") || def || "";
      }
    };
  }

  /**
   * Displays amount and units together for a sample.
   */
  // @ngInject
  function sampleAmount($sce: ng.ISCEService) {
    return (sample: Models.Sample, amount?: number) => {
      if (sample) {
        var unit = sampleUnit()(sample);
        return $sce.trustAsHtml((amount || sample.amount) +
                                (unit ? "&nbsp;" + unit : ""));
      }
    };
  }

  /**
   * Multiplies sample amount by DNA concentration, taking sample
   * class units into account.
   */
  function sampleEffectiveAmount() {
    return (item: Models.Sample) => {
      if (item && _.isNumber(item.amount) && _.isNumber(item.concentration)) {
        var cls = <Models.SampleClass>item.cls;
        if (cls && _.isNumber(cls.unit_multiplier)) {
          return item.amount * item.concentration * cls.unit_multiplier / 1e-6;
        }
      }
    };
  }

  angular.module('kindred.sample.filters', [])
    .filter("sampleId", sampleId)
    .filter("containerGridCoord", containerGridCoord)
    .filter("containerGridIndex", containerGridIndex)
    .filter("sampleLocation", sampleLocation)
    .filter("sampleEventType", sampleEventType)
    .filter("sampleTransactionDate", sampleTransactionDate)
    .filter("sampleUnit", sampleUnit)
    .filter("sampleAmount", sampleAmount)
    .filter("sampleEffectiveAmount", sampleEffectiveAmount);
}
