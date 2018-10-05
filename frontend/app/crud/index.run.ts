module kindred {
  'use strict';

  // @ngInject
  function restangularConfig(RestangularProvider: restangular.IProvider, appConfig: AppConfig) {
      function stripBaseUrl(url) {
        if (url && url.substring(0, appConfig.api_base.length) === appConfig.api_base) {
          url = url.substring(appConfig.api_base.length);
        }
        return url;
      }

      RestangularProvider.setBaseUrl(appConfig.api_base);
      RestangularProvider.setRestangularFields({
        selfLink: "self.resource_uri"
      });

      RestangularProvider.addResponseInterceptor(function(response, operation) {
        var newResponse;
        if (operation === 'getList') {
          // Here we're returning an Array which has one special property
          // metadata with our extra information
          newResponse = response.objects;
          newResponse.metadata = response.meta;
        } else {
          // This is an element
          newResponse = response;
        }
        return newResponse;
      });

    var personTransform = person => {
      // the ../../ url munging is bad
      var getParent = function(name) {
        return function() {
          return person[name] ?
            person.oneUrl('../../' + stripBaseUrl(person[name])).get() :
            null;
        };
      };
      person.getMother = getParent('mother');
      person.getFather = getParent('father');

      // Fetch all the person's diagnosis resources
      person.addRestangularMethod(
        'getDiagnoses',
        'getList',
        '../../diagnosis',
        {'person': person.id});

      // FIXME: this should probably be replaced, I'd bet there's data
      // in KINDRED in the "wrong" field that'll mean children get lost from
      // this query
      var children_query = {};
      children_query[person.sex === 'M' ? 'father' : 'mother'] = person.id;
      person.addRestangularMethod(
        'getChildren', 'getList', '..', children_query);

      person.addRestangularMethod(
        'getInvestigations',
        'getList',
        '../../investigation',
        { person: person.id });

      person.addRestangularMethod(
        'getTumourPath',
        'getList',
        '../../tumourpath',
        { person: person.id });

      person.addRestangularMethod(
        'getClinicalFeatures',
        'getList',
        '../../personclinicalfeature',
        { person: person.id });

      person.addRestangularMethod(
        'getHasFeatures',
        'getList',
        '../../hasfeature',
        { person: person.id, limit: 0 });

      person.addRestangularMethod(
        'getReferrals',
        'getList',
        '../../referral',
        { person: person.id });

      person.addRestangularMethod(
        'getAddresses',
        'getList',
        '../../personaddress', {
          person: person.id
        });
      person.addRestangularMethod(
        'getAppointmentRequests',
        'getList',
        '../../appointmentrequest', {
          person: person.id
        });

      person.addRestangularMethod(
        'getFamilyGroups',
        'getList',
        'family_groups');
      person.addRestangularMethod(
        'getFamilyMembership',
        'getList',
        '../../familymember', {
          person: person.id
        });

      person.addRestangularMethod(
        'getEvents',
        'getList',
        '../../event', {
          person: person.id
        });

      person.addRestangularMethod(
        'getStudyMembership',
        'getList',
        '../../studymember', {
          patient: person.id
        });

      person.tastySave = function() {
        return this.save();
      };

      return person;
    };

    var eventTransform = (event: Models.Event) => {
      event.addRestangularMethod(
        'getSamples',
        'getList',
        '../../sample', {
          transactions__samplecollection__event: event.id
        });
      return event;
    };

    var sampleTransform = (sample: Models.Sample) => {
      var getFirstTransaction = (name: string) => {
        return () => {
          return <any>_(sample.transactions).filter(name).first();
        };
      };
      sample.getCollection = getFirstTransaction("samplecollection");
      sample.getProcessed = getFirstTransaction("sampleprocessed");
      sample.getFixedFrozen = getFirstTransaction("samplefixedfrozen");

      sample.getCollectionEvent = () => {
        var collection = <Models.Transaction>sample.getCollection();
        if (collection) {
          var xact = <Models.SampleCollection>collection.samplecollection;
          return sample.oneUrl("event", <string>xact.event).get();
        } else {
          return <ng.IPromise<Models.Event>>new Promise((r,f) => r(null));
        }
      };

      //sample.addRestangularMethod('getOwner', 'get', '../../person', sample.owner);
      sample.getOwner = () => {
        if (sample.owner) {
          return sample.oneUrl("person", <string>sample.owner).get();
        } else {
          return <ng.IPromise<Models.Person>>new Promise((r,f) => r(null))
        }
      };

      // fixme: this is fairly likely to break
      sample.isDNA = () => {
        var cls = <Models.SampleClass>sample.cls;
        return cls && cls.name === 'Nucleic Acid';
      };
      sample.isTissue = () => {
        var cls = <Models.SampleClass>sample.cls;
        return cls && cls.name === 'Tissue';
      };

      return sample;
    };


    RestangularProvider.addElementTransformer('person', false, personTransform);
    RestangularProvider.addElementTransformer('event', false, eventTransform);
    RestangularProvider.addElementTransformer('sample', false, sampleTransform);

    RestangularProvider.addElementTransformer('studygroup', false, (group: Models.StudyGroup) => {
      group.append = jq => group.post("append", { jq: jq, append: true });
      return group;
    });
  }

  // @ngInject
  function restangularFixups(Restangular, kinSchema) {
    var concatname = function(model) {
      var parts = [];
      if (model) {
        if (model.first_name) {
          parts.push(model.first_name.trim());
        }
        if (model.second_name) {
          parts.push(model.second_name.trim());
        }
        if (model.last_name) {
          parts.push(model.last_name.trim());
        }
        if (model.last_name && model.initials &&
            !model.first_name && !model.second_name) {
          parts[0] = parts[0] + ","
          parts.push(model.initials);
        }
        if (parts.length === 0) {
          parts.push('No name');
        }
        model.name = parts.join(' ');
      }
      return model;
    };

    var person_models = ['person', 'doctor', 'foetus'];
    // register hooks for API->JS
    _.each(person_models, function(model_name) {
      Restangular.extendModel(model_name, concatname);
    });

    var refobjs_to_uris = function(obj, reference_names: string[]) {
      _.each(reference_names, function(name) {
        if (obj[name] && _.has(obj[name], 'resource_uri')) {
          obj[name] = obj[name].resource_uri;
        }
      });
    };
    // HTML5 date field returns '' when no date set, but we want
    // 'null' for the API
    var empty_strings_to_nulls = function(obj, date_names: string[]) {
      _.each(date_names, function(name) {
        if (obj[name] == '') {
          obj[name] = null;
        }
      });
    };

    var fieldnames_of_type = function(schema, type) {
      return _.keys(_.pick(schema.fields, function(v, _) {
            return v.type === type;
          }));
    };

    Restangular.addRequestInterceptor(function saveFixups(element, operation, what, url) {
      if (_.includes(['put', 'post', 'patch'], operation)) {
        if (_.has(element, '_schema')) {
          var fields = _.partial(fieldnames_of_type, element._schema);

          refobjs_to_uris(element, fields('related'));
          empty_strings_to_nulls(element, fields('datetime'));
        }
      }
      return element;
    });

    Restangular.addResponseInterceptor(function(data, operation, what) {
      // After a response comes back, fire off a request to fetch the
      // schema so that it's ready in case we would like to save the
      // an object.
      if (_.includes(['get', 'getList'], operation)) {
        kinSchema.get(what);
      }
      return data;
    });
  }


  function setupRestangularErrorInterceptor(Restangular: restangular.IService,
                                            kinError: ErrorService, kinSession: SessionService) {
    var CANCELLED = -1, UNAUTHORIZED = 401, PRECONDITION_FAILED = 412;
    Restangular.setErrorInterceptor((response, deferred) => {
      if ((response.status !== CANCELLED) &&
          (response.status !== UNAUTHORIZED || kinSession.user.loggedIn) &&
          (response.status !== PRECONDITION_FAILED)) {
        kinError.handle({ type: "restangular", data: response });
      }
      return true;
    });
  }

  angular.module('kindred.crud.run', ['kindred.config', 'restangular'])
    .config(restangularConfig)
    .run(restangularFixups)
    .factory('CachedRestangular', function(Restangular) {
      return Restangular.withConfig(function(RestangularConfigurer) {
        RestangularConfigurer.setDefaultHttpFields({cache: true});
      });
    })
    .run(setupRestangularErrorInterceptor);
}
