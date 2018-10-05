module kindred {
  'use strict';

  let attachButtonComponent: ng.IComponentOptions = {
    templateUrl: "app/components/attachments/button.html",
    bindings: {
      item: "<",
      btnClass: "@"
    },
    controller: class {
      item: Models.Any;
      btnClass: string;

      attachments: AttachmentsObject;
      files: Models.FileAttachment[];
      uploads: any[];

      // @ngInject
      constructor(private kinAttachments: AttachmentsService,
                  private kinError: ErrorService,
                  $scope: ng.IScope) {
        $scope.$watch("$ctrl.uploads", uploads => this.upload(uploads));
        $scope.$watch("$ctrl.item", () => this.itemChanged(this.item));
        $scope.$watch("$ctrl.btnClass", () => {
          this.btnClass = this.btnClass || "btn-default";
        });
      }

      upload(files) {
        if (files && files.length) {
          this.attachments.upload(files).catch(function(e) {
            this.kinError.handle({ type: "upload", data: e });
          });
        }
      }

      private itemChanged(item) {
        this.attachments = this.kinAttachments(item);
          if (this.attachments) {
            this.attachments.get().then(files => {
              this.files = files;
            });
          }
      }
    }
  };

  class AttachmentTableCtrl {
    files: Models.FileAttachment[];
    isLoading: boolean;

    // @ngInject
    constructor($scope: ng.IScope, kinAttachments: AttachmentsService) {
      $scope.$watch("$ctrl.item", item => {
        if (item) {
          this.isLoading = true;
          kinAttachments(item).get().then(files => {
            this.files = files;
            this.isLoading = false;
          });
        }
      });
    }
  }

  let filesTableComponent: ng.IComponentOptions = {
    templateUrl: "app/components/attachments/table.html",
    bindings: {
      item: '<',
      isLoading: '=?'
    },
    controller: AttachmentTableCtrl
  };

  let filesTableLiteComponent: ng.IComponentOptions = {
    templateUrl: "app/components/attachments/table-lite.html",
    bindings: {
      item: '<',
      isLoading: '=?'
    },
    controller: AttachmentTableCtrl
  };

  export class AttachmentsObject {
    private promise: ng.IPromise<any>;
    files: Models.FileAttachment[];
    loading: boolean;
    uploading: boolean;
    progress: number;

    constructor(private Upload, private Restangular: restangular.IService, private appConfig: AppConfig, private $q: ng.IQService, private item: Models.Any) {
      this.files = [];
      this.loading = false;
    }

    get() {
      if (!this.promise) {
        this.refresh();
      }
      return this.promise;
    }

    private refresh() {
      this.loading = true;
      this.promise = this.Restangular.all("fileattachment").getList({
        limit: 0,
        item: this.item.resource_uri
      }).then(files => {
        this.loading = false;
        this.files.splice(0, this.files.length);
        _.each(files, file => this.files.push(file));
        return this.files;
      });
    }

    upload(files, desc?) {
      this.uploading = true;
      return this.$q.all(_.map(files, file => {
        return this.Upload.upload({
          url: this.appConfig.urls["file_upload"],
          fields: {
            resource_uri: this.item.resource_uri,
            desc: desc
          },
          file: file
        })
          .progress(evt => {
            this.progress = Math.round(100.0 * evt.loaded / evt.total);
          });
      }))
        .then(results => {
          this.refresh();
        })
        .finally(() => {
          this.uploading = false;
        });
    }
  }

  export interface AttachmentsService {
    (item: Models.Any): AttachmentsObject;
  }

  // @ngInject
  function attachmentsFactory(Upload, Restangular: restangular.IService,
                              appConfig: AppConfig, $q: ng.IQService,
                              $cacheFactory: ng.ICacheFactoryService) {
    let cache = $cacheFactory("kinAttachments");

    return (item: Models.Any) => {
      if (item && item.resource_uri) {
        var attach = cache.get(item.resource_uri);

        if (!attach) {
          attach = new AttachmentsObject(Upload, Restangular, appConfig, $q, item);
          cache.put(item.resource_uri, attach);
        }

        return attach;
      }
    };
  }

  angular.module("kindred.components.attachments", ["ngFileUpload"])
    .component("kinAttachButton", attachButtonComponent)
    .component("kinFilesTable", filesTableComponent)
    .component("kinFilesTableLite", filesTableLiteComponent)
    .factory("kinAttachments", attachmentsFactory);
}
