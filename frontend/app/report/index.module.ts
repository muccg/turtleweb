module kindred {
  'use strict';

  angular.module("kindred.report", [])
    .component("kinReportView", ReportView)
    .component("kinReportListView", ReportListView)
    .component("kinReportDetailView", ReportDetailView)
    .component("kinReportEditView", ReportEditView)
    .controller("ReportListCtrl", ReportListCtrl)
    .controller("ReportEditCtrl", ReportEditCtrl)
    .controller("ReportDetailCtrl", ReportDetailCtrl)
    .directive("kinReportFrontPage", kinReportFrontPageDirective);
}
