module kindred {
  'use strict';

  export class ReportListCtrl {
    reports: Models.Report[];

    // @ngInject
    constructor(Restangular: restangular.IService, kinStudies: StudiesService) {
      var q = { study: kinStudies.current.id };
      Restangular.all("report").getList(q).then(reports => {
        this.reports = reports;
      });
    }
  }

  export class ReportEditCtrl extends BaseEditCtrl<Models.Report> {
    public static resourceName = "report";

    resourceOptions = [
      { resource: "person", name: "Patient" },
      { resource: "event", name: "Event" },
      { resource: "sample", name: "Biospecimen" }
    ];

    orderFieldNames: string[];

    orderFieldNames2 = [{
      field: "id",
      desc: "ID"
    }, {
      field: "surname",
      desc: "Surname"
    }, {
      field: "given",
      desc: "Given Name"
    }, {
      field: "dob",
      desc: "DOB"
    }, {
      field: "sex",
      desc: "Sex"
    }, {
      field: "address.suburb",
      desc: "Suburb"
    }, {
      field: "address.state",
      desc: "State"
    }];

    groupFieldNames = [
      "sex", "dob.year", "dob.month",
      "address.suburb", "address.state",
      "study", "project"
    ];

    colFieldNames = [
      "id", "surname", "given", "dob", "dod", "sex"
    ];

    // @ngInject
    constructor(kinBaseEdit, private kinSession: SessionService) {
      super(kinBaseEdit);
    }

    initItem(item) {
      // fill item with default values
      item.owner = item.owner || this.kinSession.user.resource_uri;
      item.study = item.study || this.currentStudy;
      item.resource = item.resource || "person";

      this.orderFieldNames = _.map(this.orderFieldNames2, f => f.field);

      return item;
    }

    fieldMatch(actual, expected) {
      // fixme: doesn't work yet
      return expected.desc.toLowerCase().indexOf(actual) !== -1;
    }

    beforeSave(report) {
      // convert study object into a resource uri which tastypie expects
      if (report.study && report.study.resource_uri) {
        report.study = report.study.resource_uri;
      }
      return report;
    }
  }

  export class ReportDetailCtrl extends BaseDetailCtrl<Models.Report> {
    public static resourceName = "report";
    public barchart: {
      labels: string[];
      series: string[];
      data: any[];
    };
    public piechart: {
      labels: string[];
      data: any[];
    };
    public grouping: boolean;

    // @ngInject
    constructor(kinBaseEdit) {
      super(kinBaseEdit);
    }

    itemLoaded(item) {
      var fmtLabel = function(result) {
        return result.group.join(" ") || "None";
      };
      var getData = _.property("count");

      this.barchart = {
        labels: _.map(item.result, fmtLabel),
        series: ["Data"],
        data: [_.map(item.result, getData)]
      };
      this.piechart = {
        labels: _.map(item.result, fmtLabel),
        data: _.map(item.result, getData)
      };

      this.grouping = !_.isEmpty(item.group_by);

      return item;
    }
  }

  export let ReportView: ng.IComponentOptions = {
    template: '<ng-outlet></ng-outlet>',
    $routeConfig: [
      {path: '/list',     name: 'List',   component: 'kinReportListView', useAsDefault: true},
      {path: '/add',      name: 'Add',    component: 'kinReportEditView'},
      {path: '/:id/edit', name: 'Edit',   component: 'kinReportEditView'},
      {path: '/:id',      name: 'Detail', component: 'kinReportDetailView'},
    ]
  };

  export let ReportListView: ng.IComponentOptions = {
    templateUrl: "app/report/list.html",
    controller: ReportListCtrl,
    controllerAs: "vm"
  };

  export let ReportDetailView: ng.IComponentOptions = {
    templateUrl: "app/report/detail.html",
    controller: ReportDetailCtrl,
    controllerAs: "vm"
  };

  export let ReportEditView: ng.IComponentOptions = {
    templateUrl: "app/report/edit.html",
    bindings: { $router: '<' },
    controller: ReportEditCtrl,
    controllerAs: "vm"
  };
}
