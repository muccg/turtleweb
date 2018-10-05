var timeout = 30 * 1000;

// default 5s timeout seems too slow [java startup time]
jasmine.getEnv().defaultTimeoutInterval = timeout;

describe('kindred', function() {

  // control a kinSimpleSelect.
  // pfx is the control name
  // search_term is term to type into autocomplete; expect_result is the
  // intended first result.
  // returns a promise after selecting that item
  var control_kinItemSelect = function(pfx, search_term, expect_result) {
    // now look up a diagnosis and set it
    return element(by.id(pfx + '-find')).click().then(function() {
      // Empty is a default string added by the namelists tests above
      // In production it will be a diagnosis index name
      element(by.id(pfx + '-autocomplete')).sendKeys(search_term);
      matches = element(by.repeater('comp in autocomplete').row(0));
      expect(matches.getText()).toEqual(expect_result);
      return matches.click();
    });
  }

  var testKinInfoBlocks = function(blockname, field, values) {

    field = field || '';
    values = values || [];

    if (values.length == 0) {
      var summary = element(by.id(blockname + '-info-summary-block'));
      summary.all(by.css('.kin-info-no-records')).then(function(elems) {
        expect(elems.length).toEqual(1);
      });
      return;
    }

    var button = element(by.id(blockname + '-info-block-reveal'));
    var block = element(by.id(blockname + '-info-block'));

    button.click().then(function() {
      block.all(by.repeater('item in items')).then(function(rows) {
        expect(rows.length).toEqual(values.length);
      });

      if (values.length) {
        block.all(by.id('value-' + field)).then(function(elems) {
          for (var i = 0; i < values.length; i++) {
            expect(elems[i].getText()).toEqual(values[i]);
          }
        });
      }      
    });
  };

  // This seemed to be necessary to make webdriver wait on elements.
  // jasmine's above was ignored. Set this to the same value.
  browser.manage().timeouts().implicitlyWait(timeout);

  it('should ask for login', function() {
    browser.get('');

    element(by.model('creds.email')).sendKeys('root@localhost');
    element(by.model('creds.password')).sendKeys('hello');

    element(by.id('login-btn')).click().then(function() {
      var email = element(by.binding('logged_in.email'));
      expect(email.getText()).toEqual('root@localhost');
    });
  });

  it('should still be logged in', function() {
    var email = element(by.binding('logged_in.email'));
    expect(email.getText()).toEqual('root@localhost');
  });

  it('should be persons on front page', function() {
    var matches = element(by.binding('search.total_count'));
    expect(matches.getText()).toBeGreaterThan(0);
  });

  describe('investigations', function() {
    it('should have two investigations on Rodney Smith', function() {
      browser.get('persons/2/investigations');
      browser.findElements(
        by.repeater('investigation in investigations'))
        .then(function(rows) {
          expect(rows.length).toEqual(2);
        });
      // check the sort order is stable
      element.all(by.binding('investigation.test_comment')).then(function(elems) {
        expect(elems.length).toEqual(2);
        expect(elems[0].getText()).toEqual("Very few details on this investigation.");
        expect(elems[1].getText()).toEqual("First test on issue...");
      });
    });
    it('should have zero investigations on Wendy Smith', function() {
      browser.get('persons/3/investigations');
      browser.findElements(
        by.repeater('investigation in investigations'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  });

  describe('surveillance', function() {
    it('should have two surveillance records on Rodney Smith', function() {
      browser.get('persons/2/surveillance');
      browser.findElements(
        by.repeater('surveillance in surveillances'))
        .then(function(rows) {
          expect(rows.length).toEqual(2);
        });
      // check the sort order is stable
      element.all(by.binding('surveillance.comment')).then(function(elems) {
        expect(elems.length).toEqual(2);
        expect(elems[0].getText()).toEqual("An earlier sample surveillance record");
        expect(elems[1].getText()).toEqual("Sample surveillance record");
      });
    });
    it('should have zero surveillance on Wendy Smith', function() {
      browser.get('persons/3/surveillance');
      browser.findElements(
        by.repeater('surveillance in surveillances'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  });

  describe('file links', function() {
    it('should have two file links for Rodney Smith', function() {
      browser.get('persons/2/file-links');
      browser.findElements(
        by.repeater('file in files'))
        .then(function(rows) {
          expect(rows.length).toEqual(2);
        });
      // check the sort order is stable
      element.all(by.binding('file.filename')).then(function(elems) {
        expect(elems.length).toEqual(2);
        expect(elems[0].getText()).toContain("README.rst");
        expect(elems[1].getText()).toContain("shazza");
      });
    });
    it('should have zero files on Wendy Smith', function() {
      browser.get('persons/3/file-links');
      browser.findElements(
        by.repeater('file in files'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  });

  describe('foetus', function() {
    it('should have zero foetus on Rodney Smith', function() {
      browser.get('persons/2/foetus');
      browser.findElements(
        by.repeater('f in foetus'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
    it('should have one foetus on Wendy Smith', function() {
      browser.get('persons/3/foetus');
      browser.findElements(
        by.repeater('f in foetus'))
        .then(function(rows) {
          expect(rows.length).toEqual(1);
        });
    });

    it('should have one foetus on Gary Smith', function() {
      browser.get('persons/4/foetus');
      browser.findElements(
        by.repeater('f in foetus'))
        .then(function(rows) {
          expect(rows.length).toEqual(1);
        });
    });
  });

  describe('referrals', function() {
    it('should have two referrals on Rodney Smith', function() {
      browser.get('persons/2/referrals');
      browser.findElements(
        by.repeater('referral in referrals'))
        .then(function(rows) {
          expect(rows.length).toEqual(2);
        });
      // check the sort order is stable
      element.all(by.binding('referral.comment')).then(function(elems) {
        expect(elems.length).toEqual(2);
        expect(elems[0].getText()).toEqual("Minimal information");
        expect(elems[1].getText()).toEqual("Don't like the look of that");
      });
    })
    it('should have zero referrals on Wendy Smith', function() {
      browser.get('persons/3/referrals');
      browser.findElements(
        by.repeater('referral in referrals'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  })

  describe('diagnoses', function() {
    it('should have two diagnoses on Rodney Smith', function() {
      browser.get('persons/2/diagnoses');
      testKinInfoBlocks(
        'diagnosis', 'status.name', ['Affected', 'Not Affected']);
    });

    it('should have zero diagnoses on Wendy Smith', function() {
      browser.get('persons/3/diagnoses');
      testKinInfoBlocks('diagnosis', 'status.name', []);
    });

    it('should not clobber existing nullable selects with defaults', function() {
      browser.get('diagnosis/1/edit');
      expect(element(by.binding('diagnosis.verified')).value).toEqual(null);
    });
  });

  describe('tumour pathology', function() {
    it('should have two tumour pathology records on Rodney Smith', function() {
      browser.get('persons/2/tumour-pathology');
      browser.findElements(
        by.repeater('path in tumour_path'))
        .then(function(rows) {
          expect(rows.length).toEqual(2);
        });
      // check the sort order is stable
      element.all(by.binding('path.comment')).then(function(elems) {
        expect(elems.length).toEqual(2);
        expect(elems[0].getText()).toEqual("Minimal tumour pathology");
        expect(elems[1].getText()).toEqual("Detailed tumour pathology");
      });
    })
    it('should have zero tumour pathology records on Wendy Smith', function() {
      browser.get('persons/3/tumour-pathology');
      browser.findElements(
        by.repeater('path in tumourPath'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  })

  describe('clinical features', function() {
    it('should have two clinical features on Rodney Smith', function() {
      browser.get('persons/2/clinical-features');
      browser.findElements(
        by.repeater('person_feature in clinical_features'))
        .then(function(rows) {
          expect(rows.length).toEqual(2);
        });
      // check the sort order is stable
      element.all(by.binding('person_feature.comment')).then(function(elems) {
        expect(elems.length).toEqual(2);
        expect(elems[0].getText()).toEqual("Minimal data clinical feature");
        expect(elems[1].getText()).toEqual("Detailed clinical feature");
      });
    })
    it('should have zero clinical features on Wendy Smith', function() {
      browser.get('persons/3/clinical-features');
      browser.findElements(
        by.repeater('person_feature in clinical_features'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  })

  describe('appointment requests', function() {
    it('should have two appointment requests on Rodney Smith', function() {
      browser.get('persons/2/appointment-requests');
      browser.findElements(
        by.repeater('pr in requests'))
        .then(function(rows) {
          expect(rows.length).toEqual(2);
        });
    })
    it('should have zero appointment requests on Wendy Smith', function() {
      browser.get('persons/3/appointment-requests');
      browser.findElements(
        by.repeater('pr in personClinicalFeatures'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  })

  describe('medical records', function() {
    it('should have two medical records for Rodney Smith', function() {
      browser.get('persons/2/medical-records');
      browser.findElements(
        by.repeater('record in medical_records'))
        .then(function(rows) {
          expect(rows.length).toEqual(2);
        });
      // check the sort order is stable
      element.all(by.binding('record.comment')).then(function(elems) {
        expect(elems.length).toEqual(2);
        expect(elems[0].getText()).toEqual("This is dummy medical record for test purposes");
        expect(elems[1].getText()).toEqual("This is another dummy medical record for test purposes");
      });
    });
    it('should have zero medical records on Wendy Smith', function() {
      browser.get('persons/3/medical-records');
      browser.findElements(
        by.repeater('record in medical_records'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  });

  describe('consent records', function() {
    it('should have two consent records for Rodney Smith', function() {
      browser.get('persons/2/consent-records');
      browser.findElements(
        by.repeater('consent in consent_records'))
        .then(function(rows) {
          expect(rows.length).toEqual(2);
        });
      // check the sort order is stable
      element.all(by.binding('consent.comment')).then(function(elems) {
        expect(elems.length).toEqual(2);
        expect(elems[0].getText()).toEqual("Consent given");
        expect(elems[1].getText()).toEqual("Consent given again");
      });
    });
    it('should have zero consent records on Wendy Smith', function() {
      browser.get('persons/3/consent-records');
      browser.findElements(
        by.repeater('consent in consent_records'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  });

  describe('contacts', function() {
    it('should have three contacts on Rodney Smith', function() {
      browser.get('persons/2/contacts');
      browser.findElements(
        by.repeater('contact in contact_records'))
        .then(function(rows) {
          expect(rows.length).toEqual(3);
        });
      // should be ordered by date done
      element.all(by.binding('contact.date_done')).then(function(elems) {
        expect(elems.length).toEqual(3);
        expect(elems[0].getText()).toEqual("27/02/2007");
        expect(elems[1].getText()).toEqual("07/03/2007");
        expect(elems[2].getText()).toEqual("06/06/2014");
      });
    })
    it('should have zero contacts on Wendy Smith', function() {
      browser.get('persons/3/contacts');
      browser.findElements(
        by.repeater('contact in contact_records'))
        .then(function(rows) {
          expect(rows.length).toEqual(0);
        });
    });
  })

  it('should have families on family index', function() {
    browser.get('family');
    var matches = element(by.binding('search.total_count'));
    expect(matches.getText()).toBeGreaterThan(0);
  });

  it('should have person details for system user', function() {
    browser.get('persons/1');
    var matches = element(by.binding('person.last_name'));
    expect(matches.getText()).toEqual("User");

    var matches = element(by.binding('person.first_name'));
    expect(matches.getText()).toEqual("System");

    var matches = element(by.binding('person.second_name'));
    expect(matches.getText()).toEqual("");

    var matches = element(by.binding('person.dob | apiDateShow'));
    expect(matches.getText()).toEqual("01/01/1970");
  });

  it('should have ethnic group information for Ian Smith', function() {
    // NB: hard-coded IDs should be phased out, however they are stable
    // within the test runner so we can cope for now
    browser.get('persons/10');
    var matches = element(by.binding('person.ethnic_group'));
    expect(matches.getText()).toEqual('English');
  });

  it('should have blank ethnic group information for Ann Smith', function() {
    // NB: hard-coded IDs should be phased out, however they are stable
    // within the test runner so we can cope for now
    browser.get('persons/9');
    var matches = element(by.binding('person.ethnic_group'));
    expect(matches.getText()).toEqual('');
  });


  describe("namelists", function() {
    it('should have namelists', function() {
      browser.get('namelist');

      var allLinks = element.all(by.css('.namelist-link'));
      expect(allLinks.count()).toBeGreaterThan(0);
    });

    it('should be able to add some namelists', function() {
      var namelists = ["modeofinheritance", "diagnosisindex", "timingofdiagnosis",
        "diagnosisstatus", "diagnosisverified", "bodypart"];

      namelists.forEach(function(item) {
        browser.get('namelist/'+item);
        element(by.name('add-selection-btn')).click().then(function() {
          expect(element.all(by.repeater('row in renderedRows').column('name')).last(0).getText()).toEqual('Empty');
          element(by.name('save-selection-btn')).click();
        });
      });
    });

    it('should be able to remove one of the namelists', function() {
      // depends on fixture size, fixme
      browser.get('namelist/bodypart');
      element(by.repeater('row in renderedRows')
        .row(1)).element(by.id('delete-row-btn')).click().then(function() {
          browser.get('namelist/bodypart');
          var rows;
          rows = browser.findElements(
            by.repeater('row in renderedRows'))
            .then(function(rows) {
              expect(rows.length).toEqual(1);
            });
        });
    });
  });

  describe('family details', function() {
    it('should show family name on detail page', function() {
      browser.get('family/1');
      var matches = element(by.binding('family.desc'));
      expect(matches.getText()).toEqual('My Family');
    });

    it('should have rendered the pedigree', function() {
      browser.get('family/1');
      browser.findElements(
      by.css('svg rect'))
      .then(function(rects) {
        expect(rects.length).toBeGreaterThan(0);
      });
    });
  });

  it('should have no audit and cleanup entries', function() {
    browser.get('audit/group');
    var matches = element(by.id('audit-no-matches'));
    expect(matches.getText()).toEqual('No matches found.');
  });

  // no test data for this page, for now just check that the URL
  // routing hasn't vanished
  it('migration report page should load', function() {
    browser.get('migration');
    var matches = element(by.id('title'));
    expect(matches.getText()).toEqual('Migration Report');
  });

  describe('doctors', function() {
    var checkurl = null;

    it('should be able to search for Dr. Example Doctor', function() {
      browser.get('doctors');

      //var kinlist = element(by.tagName('kin-list'));
      var grid = by.repeater('row in renderedRows');
      var row = grid.row(0);
      var cell = row.column('name');

      // First doctor should be Dr. Jaspol Sembi
      expect(element(cell).getText()).toContain('Example');

      // Grab Dr. Sembi's resource URI for the next test
      element(row).element(by.name('doctorlink')).getAttribute('href')
        .then(function(href) {
          checkurl = href;
        })

    });

    it('should have doctor details', function() {
      browser.get(checkurl);
      var matches = element(by.binding('doctor.last_name'));
      expect(matches.getText()).toEqual("Doctor");

      var matches = element(by.binding('doctor.first_name'));
      expect(matches.getText()).toEqual("Example");

      var matches = element(by.binding('doctor.type.name'));
      expect(matches.getText()).toEqual('GP');
    });
  });

  it('should have appointment type information for configuration', function() {
    browser.get('namelist/appointmenttype');

    var matches = element(by.binding('model_name | capToSpace'));
    expect(matches.getText()).toEqual('Appointment Type');
  });

  describe('John Watson', function() {

    it('should be able to add John Watson as a contact', function() {

      browser.get('persons/add');

      element(by.model('item.last_name')).sendKeys('Watson');
      element(by.model('item.first_name')).sendKeys('John');
      element(by.css('select option[value="M"]')).click();
      element(by.id('save-btn')).click().then(function() {
        matches = element(by.id('message'));
        expect(matches.getText()).toEqual('Person added.');
      });
    });

    it('should be able to add referral for John Watson', function() {
      element(by.linkUiSref('person.detail.add-referral')).click().then(function() {
        // fill out the simple form elements
        element(by.id('start_date')).sendKeys('22/09/1980').then(function(){
          element(by.css('select option[value="R"]')).click().then(function() {
            control_kinItemSelect('referral.by', 'Example', 'Example Doctor, Brentwood Village Medical Centre,67 Cranford Ave').then(function() {
                element(by.id('save-btn')).click().then(function() {
                  matches = element(by.id('message'));
                  var p = matches.getText();
                  expect(p).toEqual('Referral added');
                });
            });
          });
        })
      });
    });

    it('should be able to add contact for John Watson', function() {
      element(by.linkUiSref('person.detail.add-contact')).click().then(function() {
        // fill out the simple form elements
        element(by.id('time_spent')).sendKeys('15').then(function(){
          element(by.id('save-btn')).click().then(function() {
            matches = element(by.id('message'));
            var p = matches.getText();
            expect(p).toEqual('Contact added');
          });
        });
      });
    });

    it('should be able to diagnose John Watson with something nasty', function() {
      element(by.linkUiSref('person.detail.add-diagnosis')).click().then(function() {
        // check that defaults are applied for a new nullable kinSimpleSelect
        // took bloody ages to work this out
        expect(element(by.model('diagnosis.verified')).$('option:checked').getText()).
          toEqual('Verily Verified')
        expect(element(by.model('diagnosis.status')).$('option:checked').getText()).
          toEqual('Affected')
        // fill out the simple form elements
        element(by.model('diagnosis.age')).sendKeys('30');
        element(by.model('diagnosis.comment')).sendKeys('Testing');
        element(by.model('diagnosis.year')).sendKeys('2014');
        // now look up a diagnosis and set it
        control_kinItemSelect('diagnosis.index', 'Meth', 'Methuselah Syndrome').then(function() {
          element(by.id('save-btn')).click().then(function() {
            matches = element(by.id('message'));
            var p = matches.getText();
            expect(p).toEqual('Diagnosis added');
            });
          });
      })
    });

    describe('HPO clinical features', function() {
      it('should be able to add HPO clinical feature', function() {
      element(by.linkUiSref('person.detail.edit-clinical-features')).click().then(function() {
          element(by.css('button.form-control')).click().then(function() {
            element(by.css('input.form-control:nth-child(2)')).sendKeys('foot').then(function() {
              element(by.binding('feature.label | highlight: $select.search'))
                .click().then(function() {
                  element(by.css('.btn-success')).click().then(function() {
                    element(by.id('save-btn')).click().then(function() {
                      matches = element(by.id('message'));
                      var p = matches.getText();
                      expect(p).toEqual('Clinical features saved.');
                    });
                  });
                });
            })
          });
        });
      });

      it('should be able to remove HPO clinical feature', function() {
        element(by.linkUiSref('person.detail.edit-clinical-features')).click().then(function() {
          element(by.css('button.ng-pristine:nth-child(1)')).click().then(function() {
            element(by.id('save-btn')).click().then(function() {
              matches = element(by.id('message'));
              var p = matches.getText();
              expect(p).toEqual('Clinical features saved.');
            });
          });
        });
      });
    });

    it('should remove John Watson without leaving any incriminating evidence', function() {
      element(by.linkUiSref('person.detail.edit')).click().then(function() {
        element(by.id('delete-btn')).click().then(function() {
          matches = element(by.id('message'));
          expect(matches.getText()).toEqual('Person deleted.');
        })
      })
    });
  });

  it('should return to the login prompt on logout', function() {
    element(by.binding('logged_in.email')).click().then(function() {
      element(by.id('logout')).click().then(function() {
        element(by.id('login')).then(function(matches) {
          expect(matches.getText()).toEqual('Log in');
        });
      })
    })
  });

});
