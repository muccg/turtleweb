module kindred {
  'use strict';

  angular.module('kindred.studygroup', [])
    .component("kinStudyGroupView", StudyGroupView)
    .component("kinStudyGroupListView", StudyGroupListView)
    .component("kinStudyGroupDetailView", StudyGroupDetailView)
    .component("kinStudyGroupEditView", StudyGroupEditView)
    .controller("StudyGroupListCtrl", StudyGroupListCtrl)
    .controller("StudyGroupDetailCtrl", StudyGroupDetailCtrl)
    .controller("StudyGroupEditCtrl", StudyGroupEditCtrl);
}
