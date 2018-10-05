module Models {
  'use strict';

  import G = GenModels;
  import r = restangular;

  export interface BaseModel extends r.IElement {
  }

  export interface UserPerms {
    djangoAdmin: boolean;
    patientEdit: boolean;
    userEdit: boolean;
    fieldEdit: boolean;
    siteAdmin: boolean;
  };
  export interface User extends G.user {
    perms: UserPerms;
    loggedIn: boolean;
  };
  export interface Person extends G.person {
    getAddresses(): r.ICollectionPromise<PersonAddress>;
    getStudyMembership(): r.ICollectionPromise<StudyMember>;
    getEvents(params?: {}): r.ICollectionPromise<Event>;
  };
  export interface PersonAddress extends G.personaddress {};
  export interface ContactDetails extends G.contactdetails {};
  export interface Country extends G.country {};
  export interface State extends G.state {};
  export interface Suburb extends G.suburb {};
  export interface StudyMember extends G.studymember {};
  export interface StudyConsent extends G.studyconsent {};
  export interface ConsentStatus extends G.consentstatus {};
  export interface PatientCase extends G.patientcase {};
  export interface PatientHasCase extends G.patienthascase {};
  export interface StudyGroup extends G.studygroup {
    append(expr: Search.ApiSearchExpr): ng.IPromise<{ success: boolean, total: number, added: number }>;
  };
  export interface Suburb extends G.suburb {};

  export interface Event extends G.event {
    getSamples(params?: {}): r.ICollectionPromise<Sample>;
  };
  export interface Study extends G.study {};
  export interface PatientCase extends G.patientcase {};

  export interface CustomDropDownList extends G.ddl {};
  export interface CustomDropDownValue extends G.ddv {};
  export interface CustomDataSchema extends G.customdataschema {
    schema: CustomSchema;
  };
  export interface AbstractNameList extends G.abstractnamelist {};
  export interface AbstractNameListItem extends Any {
    name: string;
    desc?: string;
    order: number;
    default: boolean;
  };
  export interface EventType extends G.eventtype {
    fields: CustomSchema;
  };

  export interface ContainerClass extends G.containerclass {};
  export interface ContainerSample {
    sample: number;
    x: number;
    y: number;
    z: number;
  };
  export interface Container extends G.container {
    samples: ContainerSample[];
  };
  export interface Sample extends G.sample {
    getCollection(): Models.Transaction;
    getProcessed(): Models.Transaction;
    getFixedFrozen(): Models.Transaction;
    getCollectionEvent(): ng.IPromise<Models.Event>;
    getOwner(): ng.IPromise<Models.Person>;
    isDNA(): boolean;
    isTissue(): boolean;
  };
  export interface SampleClass extends G.sampleclass {};
  export interface SampleSubtype extends G.samplesubtype {};
  export interface SampleLocation extends G.samplelocation {};
  export interface Transaction extends G.transaction {
    samplecollection: SampleCollection;
  };
  export interface SampleCollection extends G.samplecollection {};

  export interface Report extends G.report {};
  export interface ReportFrontPage extends G.reportfrontpage {};
  export interface Search extends G.search {};
  export interface FileAttachment extends G.fileattachment {};

  export interface UserPrefs extends G.userprefs {};

  export interface ContentType extends r.IElement {
    app_label: string;
    id: number;
    model: string;
    resource_uri: string;
  };

  export interface Version extends r.IElement {
    id: number;
    revision: {
      id: number;
      date_created: string;
      user: User
    };
    content_type: ContentType;
    data: {};
    data_hash: string;
  };

  // this is approximately what tastypie produces from its schema view
  export interface ApiSchema {
    allowed_detail_http_methods: string[];
    allowed_list_http_methods: string[];
    default_format: string;
    default_limit: number;
    fields: {
      [index: string]: {
        blank: boolean;
        choices: any[];
        default: any;
        help_text: string;
        max_length: number;
        nullable: boolean;
        readonly: boolean;
        type: string;
        unique: boolean;
        verbose_name: string;
        related_resource?: string;
        related_type?: string;
      }
    }[];
    filtering: {},
    model: {
      app: string;
      name: string;
      str_args: string[];
      str_format: string;
      verbose_name: string;
      verbose_name_plural: string;
    },
    ordering: string[];
  }

  // this is a variation on JSON Schema for use in custom data fields
  export interface CustomSchema {
    properties: CustomProperties;
    title: string;
    required?: string[];

    // not in json schema spec
    // list of cases for which a field should be hidden
    caseHiding: {
      [index: string]: G.patientcase_uri[];
    };
  }

  export interface CustomProperties {
    [index: string]: CustomProp;
  }

  export interface CustomProp {
    type: string;
    title: string;
    description?: string;
    order?: number;
    enum?: string[];

    // not in json schema spec
    required?: boolean;
    propertyOrder?: number;
    resource?: string; // for resourceId type
  }

  export interface Any {
    id?: number;
    resource_uri?: string;
  }

  export interface AnyElement extends r.IElement, Any {
    id?: number;
    resource_uri?: string;
  }

  export interface LoginResult {
    success: boolean;
    token: string;
    idle?: number;
  }
}
