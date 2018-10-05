module kindred {
  'use strict';

  class ReportFrontPageController {
    private resource: restangular.IElement;
    reportFrontPage: Models.ReportFrontPage[];
    reports: Models.Report[];
    availableReports: Models.Report[];
    editMode: boolean;
    study: Models.Study;

    // @ngInject
    constructor(private Restangular: restangular.IService) {
      this.resource = Restangular.all("reportfrontpage");
    }

    setStudy(study) {
      this.study = study;
      if (study) {
        this.resource
          .getList({ report__study: study.id })
          .then(rfp => {
            this.reportFrontPage = rfp;
          });
      } else {
        this.reportFrontPage = null;
      }
    }

    setEditMode(editing) {
      this.editMode = editing;
      if (editing && !this.reports) {
        var req = this.Restangular.all("report")
          .getList({ study: this.study.id });
        this.reports = req.$object;
        req.then(reports => {
          this.updateAvailableReports();
        });
      }
    }

    private updateAvailableReports() {
      var used = _.keyBy(this.reportFrontPage, (rfp: any) => rfp.report.id);
      var isUnused = (report: Models.Report) => !used[report.id];
      this.availableReports = _.filter(this.reports, isUnused);
    }

    remove(index) {
      this.reportFrontPage[index].remove().then(() => {
        this.reportFrontPage.splice(index, 1);
        this.updateAvailableReports();
      });
    }

    addReport(report) {
      if (report) {
        this.resource.post({
          report: report.resource_uri,
          order: this.reportFrontPage.length
        }).then((rfp: Models.ReportFrontPage) => {
          this.reportFrontPage.push(rfp);
          this.updateAvailableReports();
        });
      }
    }


  }

  // @ngInject
  export function kinReportFrontPageDirective(): ng.IDirective {
    return {
      restrict: 'E',
      templateUrl: "app/report/front-page.html",
      scope: {
        study: '='
      },
      controller: ReportFrontPageController,
      controllerAs: 'vm',
      link: function(scope: any, elem, attrs, ctrl: ReportFrontPageController) {
        scope.$watch("study", function(study) {
          ctrl.setStudy(study);
        });
      }
    };
  }
}
