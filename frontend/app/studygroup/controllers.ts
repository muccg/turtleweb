module kindred {
  'use strict';

  export class StudyGroupListCtrl {
    studyGroups: Models.StudyGroup[];
    perms: UserPermsService;

    // @ngInject
    constructor(Restangular: restangular.IService, kinStudies: StudiesService, kinUserPerms: UserPermsService) {
      Restangular.all("studygroup").getList({ study: kinStudies.current.id }).then(studyGroups => {
        this.studyGroups = studyGroups;
      });
      this.perms = kinUserPerms;
    }
  }

  export class StudyGroupDetailCtrl extends BaseDetailCtrl<Models.StudyGroup> {
    public static resourceName = "studygroup";

    owner: Models.Person;
    search: Searcher;
    ui: {};
    selection: Models.Person[];

    // @ngInject
    constructor(kinBaseEdit,
                private kinSearcher: SearcherService,
                private kinFlash: FlashService,
                private kinConfirm: ConfirmService) {
      super(kinBaseEdit);
      this.ui = {};
    }

    load(group) {
      this.search = this.kinSearcher.make("person", this.currentStudy,
                                          { study_group: group.id }, false);
      this.search.refresh();
      return super.load(group);
    }

    getMoreDeps(group) {
      return this.s.Restangular.oneUrl("person", <string>group.owner).get().then(owner => {
        this.owner = owner;
        return group;
      });
    }

    removeSelection() {
      var dead = _.map(this.selection, "resource_uri");
      var what = dead.length + " item" + (dead.length === 1 ? '' : 's');
      this.kinConfirm.ask({
        title: "Confirm removal",
        msg: "Are you sure you would like to remove " + what + "?",
        action: "Remove"
      }).then(() => {
        this.item.members = <any[]>_(this.item.members).map("resource_uri").difference(dead).value();
        this.item.save().then((item) => {
          this.kinFlash.flash(what + " removed.");
          this.item = item;
          this.search.refresh();
        });
      });
    }

    doSearch(resource: string) {
      var field = ["group"];
      var study = this.currentStudy;
      if (resource === "event") {
        field.unshift("patient");
      } else if (resource === "sample") {
        field.unshift("owner");
        study = null;
      }
      var search = this.kinSearcher.make(resource, study);
      search.expr = {
        name: field,
        value: this.item.name,
        exact: true
      };
    }
  }

  export class StudyGroupEditCtrl extends BaseEditCtrl<Models.StudyGroup> {
    public static resourceName = "studygroup";
    private jq: Search.ApiSearchExpr;

    // @ngInject
    constructor(kinBaseEdit, private kinSession: SessionService) {
      super(kinBaseEdit);
    }

    initItem(item) {
      item.owner = item.owner || this.kinSession.user.resource_uri;
      item.members = item.members || [];
      item.study = item.study || this.currentStudy;

      // dig out search expression cookie which may have been left by
      // "Add search to study group" function
      if (item["jq"]) {
        this.jq = item["jq"];
        delete item["jq"];
      }

      return item;
    }

    beforeSave(studygroup) {
      // convert project object into a resource uri which tastypie expects
      if (studygroup.study && studygroup.study.resource_uri) {
        studygroup.study = studygroup.study.resource_uri;
      }
      return studygroup;
    }

    afterSave(studygroup) {
      if (this.jq) {
        // after saving new study group, assign its members from query
        return studygroup.append(this.jq).then(result => studygroup);
      } else {
        return studygroup;
      }
    }
  }

  export let StudyGroupView: ng.IComponentOptions = {
    template: '<ng-outlet></ng-outlet>',
    $routeConfig: [
      {path: '/list',     name: 'List',   component: 'kinStudyGroupListView', useAsDefault: true},
      {path: '/add',      name: 'Add',    component: 'kinStudyGroupEditView'},
      {path: '/:id/edit', name: 'Edit',   component: 'kinStudyGroupEditView'},
      {path: '/:id',      name: 'Detail', component: 'kinStudyGroupDetailView'},
    ],
    bindings: { $router: '<' }
  };

  export let StudyGroupListView: ng.IComponentOptions = {
    templateUrl: "app/studygroup/list.html",
    bindings: { $router: '<' },
    controller: StudyGroupListCtrl,
    controllerAs: "vm"
  };

  export let StudyGroupDetailView: ng.IComponentOptions = {
    templateUrl: "app/studygroup/detail.html",
    bindings: { $router: '<' },
    controller: StudyGroupDetailCtrl,
    controllerAs: "vm"
  };

  export let StudyGroupEditView: ng.IComponentOptions = {
    templateUrl: "app/studygroup/edit.html",
    bindings: { $router: '<' },
    controller: StudyGroupEditCtrl,
    controllerAs: "vm"
  };
}
