module kindred {
  'use strict';

  export class GridColumnsModalService {
    // @ngInject
    constructor(private $uibModal: ng.ui.bootstrap.IModalService) {
    }

    selectColumnsModal(cols: ColScope[]) {
      var modalInstance = this.$uibModal.open({
        templateUrl: "app/components/grid/columns-modal.html",
        controllerAs: 'vm',
        controller: class {
          cols: ColScope[];
          eventTypeCols: {
            [index: string /* event_type_uri*/]: ColScope[];
          };
          eventTypes: { [index: string]: Models.EventType; };
          groups: {
            [index: string]: {
              expand: boolean;
              eventType: Models.EventType;
            };
          };
          sortableOptions: any;
          showAll: boolean;
          xportAll: boolean;

          // @ngInject
          constructor(kinEventTypes: EventTypesService) {
            this.cols = _.filter(cols, col => col.col || col.data);

            kinEventTypes.load().then(ets => {
              this.eventTypeCols = _(cols)
                .filter({ type: "event" })
                .map(col => {
                  col["depth"] = kinEventTypes.getById(col["eventType"].id);
                  return col;
                })
                .groupBy(col => col["eventType"].resource_uri)
                .valueOf();
              this.eventTypes = <any>_.keyBy(_.map(cols, "eventType"), "resource_uri");
              this.groups = _.mapValues(this.eventTypeCols, (col, et) => {
                return {
                  expand: false,
                  eventType: this.eventTypes[et]
                };
              });
            });

            this.sortableOptions = {
              axis: "y",
              handle: "> .drag-handle",
              stop: (e, ui) => {
                _.each(cols, (col, index) => {
                  col.order = 1000 + index;
                });
                _.each(this.cols, (col, index) => {
                  col.order = index + 1;
                });
                cols.sort((a, b) => a.order - b.order);
              }
            };
          }

          /** user ticks show all heading */
          showAllChanged() {
            this.updateAll("show", this.showAll);
          }

          /** user ticks export all heading */
          xportAllChanged() {
            this.updateAll("xport", this.xportAll);
          }

          private updateAll(attr: string, all: boolean) {
            if (all === true || all === false) {
              _.each(this.cols, col => {
                col[attr] = all;
              });
              _.each(this.eventTypeCols, cols => {
                _.each(cols, col => {
                  col[attr] = all;
                });
              });
            }
          }

          private updateTriState(attr: string) {
            var allAttr = attr + "All";
            var shows = _.flattenDeep([
              _.map(this.cols, attr),
              _.map(this.eventTypeCols, cols => _.map(cols, attr))
            ]);
            if (_.some(shows)) {
              this[allAttr] = _.every(shows) || null;
            } else {
              this[allAttr] = false;
            }
          }

          /** user toggled show for a column */
          showChanged(col: ColScope) {
            this.showChangedBase(col, this.cols);
            this.updateTriState("show");
          }

          /** user toggled export for a column */
          xportChanged(col: ColScope) {
            this.xportChangedBase(col, this.cols);
            this.updateTriState("xport");
          }

          /** user toggled show for an event type column */
          showChangedEvent(col: ColScope) {
            _.each(this.eventTypeCols, cols => this.showChangedBase(col, cols));
            this.updateTriState("show");
          }

          /** user toggled export for an event type column */
          xportChangedEvent(col: ColScope) {
            _.each(this.eventTypeCols, cols => this.xportChangedBase(col, cols));
            this.updateTriState("xport");
          }

          private showChangedBase(col: ColScope, cols: ColScope[]) {
            _(cols).filter(c => c.heading === col.heading).each(c => {
              c.show = col.show;
            });
          }

          private xportChangedBase(col: ColScope, cols: ColScope[]) {
            _(cols).filter(c => c.field === col.field).each(c => {
              c.xport = col.xport;
            });
          }

          toggle(et: string) {
            this.groups[et].expand = !this.groups[et].expand;
          }
          isExpanded(et: string) {
            return this.groups[et] ? this.groups[et].expand : true;
          }
          groupCols(et: string) {
            return this.groups[et].expand ? this.eventTypeCols[et] : null;
          }
          showHeading(et: string) {
            return true;
          }
        }
      });
    }
  }

  angular.module("kindred.components.grid.services", [])
    .service("kinGridColumnsModal", GridColumnsModalService);
}
