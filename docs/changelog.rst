.. _changelog:

Release Notes
=============

This page lists what changed in each Turtleweb version. For system
administrators, see :ref:`server-upgrade` for instructions on how to
upgrade the server. For users, if the new version hasn't already
appeared, try pressing Ctrl-R (refresh) in the web browser.

.. _v0-52-0:

0.52.0 – 14/09/2016
-------------------

* Bug fixes

  * #287: Sample CSV export is slow.


.. _v0-51-1:

0.51.2 – 07/09/2016
-------------------

* Fix issue affecting Django administration and SQL explorer.


.. _v0-51-1:

0.51.1 – 01/09/2016
-------------------

* Add migration dependencies to production container.

.. _v0-51-0:

0.51.0 – 01/09/2016
-------------------

* Initial version of WAGO import script


.. _v0-49-2:

0.49.2 – 01/09/2016
-------------------

* Updates to the development and production docker environment.
  No user visible changes.


.. _v0-49-1:

0.49.1 – 25/08/2016
-------------------

* Bug fixes

  * #289: Error popup when autocompleting patient case search.
  * #255: "Created" should read "Collected" on the sample list screen.
  * #288: Saving event and sample searches not working.


.. _v0-50-0:

0.50.0 – 24/08/2016
-------------------

* Bug fixes

  * #289: Error popup when autocompleting patient case search.
  * #255: "Created" should read "Collected" on the sample list screen.
  * #287: Sample CSV export is slow.
  * #288: Saving event and sample searches not working.


.. _v0-49-0:

0.49.0 – 24/06/2016
-------------------

* Bug fixes

  * #284: Fix permissions problem when adding DNA samples.
  * #280: Display patient name separated into surname, first name,
    middle names fields.
  * #282: Fix saving of most-recently-used biobank container
    preference.
  * #277: Fix sample dots not appearing in the container grid.
  * #278: Fix incorrect caching of event types after they were changed
    in admin.
  * #285: Fix handling of the error when unauthenticated users attempt
    to access certain API resources.

* Enhancements

  * #283: Allow changing units of individual samples, and add vials as
    a possible unit.
  * #286: Allow querying samples by the associated event.


.. _v0-48-0:

0.48.0 – 20/04/2016
-------------------

* Bug fixes

  * #271: Fix error in event list when clicking on patient who is no
    longer a study member.
  * #272: Fix slowness of container admin.
  * #275: Fix unselection of show/export in columns window.

* Enhancements

  * #276: Add a number of patient fields to event CSV export.


.. _v0-47-0:

0.47.0 – 08/04/2016
-------------------

* Bug fixes

  * #250: Don't limit CSV export to 1000 records.
  * #251: Fixed some dropdown menus which appeared blank even though
    they had a value set.
  * #252: Fix migration of have_path_report.
  * #256: In migration, filter out bogus biobank containers which
    break the UI.
  * #253: Pending consents don't get thumbs down in UI.
  * #258: Move container co-ordinate labels to the outside of the
    grid.
  * #257: Fix migration of values for Doctor.
  * #259: Change migration of patient deceased field to use DOD as
    well as deceased status.
  * #260: Now no patient-level TES fields are migrated except for
    cameron_db_id.
  * #262: Don't show archived studies in event type admin.
  * #263: Fix event field ordering not being updated after editing in
    admin.
  * #265: Fix recurrence dates appearing wrong in the event edit
    screen.
  * #266: Fix error when searching by recurrence date.
  * #267: Allow searching patients by the fields which appear under
    "Links to other databases".
  * #268: Fix migration of event doctor and location fields.
  * #269: Allow searching/export of event fields location,
    location_mrn, location_umrn, doctor, have_path_report, provider.
  * #270: Remove duplicate fields in search auto-complete box.

* Enhancements

  * #249: Migration of transactions
  * #264: Link to related drop-down lists in event type admin.


.. _v0-46-2:

0.46.2 – 23/03/2016
-------------------

* Bug fixes

  * #245: Don't migrate ``epi_`` fields from "epi".
  * Remove "Test Results" event from migration.
  * #246: Change consent status to a drop-down list.


.. _v0-46-1:

0.46.1 – 22/03/2016
-------------------

* Bug fixes

  * #235: Fix error when saving patient without address.
  * #236: Merge CRN and Cancer Research Number fields.
  * #239: Improve loading speed of drop-down lists.
  * #242: Allow substring search of "short list of possibilities"
    event fields.
  * #243: Fix search dropdown so that event field keyword
    auto-completions aren't hidden in submenus.
  * #244: Fix problem where related search keywords weren't getting
    autocompleted.
  * #237: Reworked patient consent status editing and migration of
    values from Filemaker.

* Enhancements

  * #238: Allow entering patient contact addresses outside of WA
    and/or outside of Australia.
  * #241: Add links to quickly move between samples of the same event.
  * #240: Warn about lost fields when changing event type, show orphan
    field values in grey.


.. _v0-45-0:

0.45.0 – 16/03/2016
-------------------

* Bug fixes

  * #231: When creating multiple samples, ensure
    processed/frozen/fixed dates are set on all of them.
  * #232: Allow choosing sample type and subtype when subdividing
    samples.
  * #233: Decrease time taken to show the first search
    results. Indicate status while the result list is loading.
  * #234: Improve slow loading of event list columns dialog. The
    headings still need to be expand/collapse otherwise it gets bogged
    down.
  * Assorted bug fixes and code clean ups.

* Enhancements

  * #229: Add file attachments and custom fields to study consent.
  * #177: Add a save/discard confirmation message when navigating away
    from modified forms.
  * #230: Add consent date keyword to search.
  * #48: allow picking and drag'n'drop of multiple locations when
    creating multiple samples.


.. _v0-44-0:

0.44.0 – 08/03/2016
-------------------

* Bug fixes

  * #189: Implement scheme for mapping patient consent status.
  * #214: Rename "Creation" transaction to "Collection".
  * #220: Fix migration of drop-down list custom fields which were
    appearing as text fields.
  * #221: Fix problem where all biobank containers were appearing in a
    long list rather than a tree.
  * #222: Add DNA extraction protocol field to sample migration.
  * #213: Migrated samples without location set will no longer have
    2mL Tube, etc as their location.
  * #216: Fix problem where split samples where shown with an
    incorrect source sample ID.
  * #224: Make custom field admin load faster when there are a large
    number of fields.
  * #223: Fix event list column selection which was failing to show
    because of a large number of event type fields.
  * #225: Fix CSV export so that a single field becomes a single CSV
    column.

* Enhancements

  * #215: Change new sample IDs to start with B- and have 7 digits.
  * #219: Allow editing/display of sample comments.
  * #218: Allow editing and deleting of sample transactions.
  * #226: Indicate required form fields with asterisks and validation
    messages.
  * #217: Warn against patient/event deletion if events/samples exist.
  * #227: Permit adding single patient to study group from detail page.
  * #228: Provide shortcut buttons to search within a study group.


.. _v0-43-0:

0.43.0 – 01/03/2016
-------------------

* Bug fixes

  * #192: Fix saving of a new sample.
  * #205: Always show comment field on patient page, even when there
    is no comment.
  * #206: Change Search box hint to say PID instead of serial number.
  * #207: Use the term "Middle Name" instead of "Second Name".
  * #208: Use the term "Alias" instead of "Other Name".
  * #210: Make Alias field visible on patient and patient edit pages.
  * #209: Show CRN and ARK PID under Links to other databases.
  * #212: Fix error pop up when deleting a saved search.


.. _v0-42-1:

0.42.1 – 26/02/2016
-------------------

* Bug fixes

  * #199: Allow deselecting all study buttons in event type admin.
  * #139: Fix migrated units of DNA and blood specimens.

* Enhancements

  * #200: Allow editing of event type after it's been created.
  * #201: Remove event time field.


.. _v0-42-0:

0.42.0 – 24/02/2016
-------------------

* Bug fixes

  * #174: Highlight current position when moving samples.
  * #181: Fix display of events on patient detail screen.
  * #182: Make add event dropdown scrollable, so that all event types
    can be added.
  * #183: Properly migrate field definitions from Turtle Filemaker.
  * #185: Fix WST->UTC timezone conversion when migrating dates and
    times.
  * #186: Fix incorrect patient ID appearing in possible duplicates
    list.
  * #190: Fix non-working study delete button in admin.

* Enhancements

  * #146: Improve editing of containers, and allow moving of
    containers.
  * #187: Add ARK ID field to biobank.
  * #188: Simplify patient samples table.
  * #138: Add specimen processed and frozen/fixed date/time
    fields. Show columns for these in the sample list, and allow
    searching on these fields.
  * #191: Add DNA Extraction Protocol field to sample.
  * #139: Ensure DNA concentration units are ng/µL, add calculation of
    effective amount (volume × concentration).
  * #197: For convenience, add links to DDL admin from custom fields
    admin.
  * #168: Add amount to sample send transaction.


.. _v0-41-1:

0.41.1 – 16/02/2016
-------------------

* Enhancements

  * #157: Display "Move" transaction as "Allocate" when the sample has
    no location yet.
  * #151: Add submenus and paging to search auto-complete menu.


.. _v0-41-0:

0.41.0 – 11/02/2016
-------------------

* Bug fixes

  * #137: Allow empty sample creation dates, remove 1970 placeholder.
  * #161: Use the correct ID field in patient list, study group.
  * #142: Fix showing and hiding of certain columns in event list
  * #160: Make the study group remove member button easier to find.
  * #159: Fix problem where study group search would be influenced by
    the current patient search.
  * #180: Search drop-down list values containing the query text
    instead of starting with the query text.

* Enhancements

  * #163: Add user-defined fields to patient and sample list.
  * #143: Add user-defined event type field columns to event list.
  * #145: Include event type in sample list columns.


.. _v0-40-1:

0.40.1 – 28/01/2016
-------------------

* Bug fixes

  * #171: Don't limit just 20 studies.
  * #173: Prevent squashing and overflow of boxes in study admin.

* Enhancements

  * #175: On patient detail screen, only show events and samples for
    current study.
  * #172: Add help text to study admin and make Add button easier to find.
  * #176: More compact location selection in sample list, added
    container browse screen.
  * #178: Tweak layout of search screens so there is more space for the
    result list.


.. _v0-40-0:

0.40.0 – 27/01/2016
-------------------

* Bug fixes

  * Permit clearing of patient consent record.
  * Fix blank study column in patient consent popup.
  * Fix duplicated study name and date in consent popup.
  * #155: Fix blank buttons on reports and study group edit pages.
  * #165: Bring back duplicates search when adding a patient.
  * #156: Fix error when saving and viewing reports on events.
  * #141: Fix problem where exported CSV was limited to 20 rows.
  * #147: Patient IDs now have 6 digits.
  * #148: Fix problem saving events where it couldn't generate an ID.
  * #170: Fix migration of patient deceased status.
  * #162: Make list columns/labels more specific.
  * #144: Stop loading message from getting stuck on.

* Enhancements

  * #150: Add middle names to patient detail screen.
  * #149: Add cause of death (cod) to patient search keywords.
  * #153: Add a button to remove patient from study.
  * #166: Allow searching events by entering a P-0123 patient ID.


.. _v0-39-0:

0.39.0 – 13/01/2016
-------------------

* Bug fixes

  * Migration: fixed/frozen transaction now only added when necessary.
  * Migration: fix sample location co-ordinates being off by one.
  * Fix container admin in cases when the container list is empty.
  * Show container co-ordinates in row-major order.
  * Change Record ID → Patient ID.
  * Fix study groups list so that it is limited by the study.
  * Display patient title.
  * Fix broken link on patient edit page.
  * Fix redirection after saving a patient.
  * Fix display of cancer registry number (CRN).
  * Hide auto-complete menu after searching.
  * Add validation of saved search name.
  * Fix problem where the first login fails agter idle logout.
  * Migration: always use E-0 ids for events

* Enhancements

  * Search by ID when only an ID or number is entered.
  * Add UMRN field to patient.
  * Remove patient date of death unknown check box.
  * Autofocus DOD input after clicking checkbox – saves a click.
  * Show full location path in patient sample list, instead of using
    tooltip.
  * Current search text is now all selected so that it can be easily
    replaced with a new search.
  * Pressing enter twice when there is a single search result will
    show the record.
  * Add "consented by" field to consent record.
  * Stick the Save/Cancel buttons so they don't scroll off the screen.
  * Allow admin of custom fields for study and consent records.
  * Highlight unconsented patients with red in patient list.
  * Use cleaner design for Django admin site.
  * Add "date archived" field to study records.
  * Label event date field as "Event Date".

.. _v0-38-0:

0.38.0 – 04/12/2015
-------------------

* Bug fixes

  * Fix software build and deployment problems.
  * Fix a bug preventing reports from being displayed.
  * Fix editing conflict detection.
  * Fix styling of patient duplicates table.
  * Fix SMS token authentication.
  * Fix sample split transaction which broke in 0.32.0.

* Enhancements

  * The :ref:`guide` has been written.
  * The Help button shows the documentation in a panel on the
    right-hand side of the screen.


.. _v0-37-0:

0.37.0 – 26/11/2015
-------------------

* Bug fixes

  * Code refactoring, clean ups, and simplification.
  * Improve the way that custom fields are stored in the database.
  * Fix filtering of report results according to study.
  * Better migration of test results into patient record.
  * Better display/editing of custom fields.
  * Fix the wrong studies being shown in the list of possible
    duplicate patient records.
  * Fix the consent:true filter so that it only applies to consent for
    the current study.
  * Fix query for id: which stopped working on event and sample.
  * Disable browser autocomplete on login and sample search forms.
  * Defer popup of autocomplete menu until click/typing.
  * Fix the container class admin.

* Enhancements

  * Allow editing the list of reports on the study front page.
  * When editing event types, show inherited fields as well.
  * Support containers into which many samples can be placed without
    grid co-ordinates.
  * Allow definition of custom fields for patient and sample. Also
    allow query based on custom fields.


.. _v0-36-0:

0.36.0 – 11/11/2015
-------------------

* Bug fixes

  * Code refactoring, clean ups, and simplification
  * Switch of browser autofill in search forms
  * Fix disappearing top navigation bar and bad links

* Enhancements

  * Allow definition of new drop-down lists for event fields
  * #58: Permit spaces in short lists of values for event fields
  * Add user password expiry
  * Require users to choose non-simple passwords
  * Small adjustments of patient fields on edit form


.. _v0-35-0:

0.35.0 – 14/10/2015
-------------------

* Fix the migration of event values.


.. _v0-34-0:

0.34.0 – 13/08/2015
-------------------

Filemaker migration and bug fix release.

* #47: Support biobank containers which have no maximum size
* Allow saving of event and sample searches
* Allow searching within previously saved searches
* Adjust fields for biobank samples
* Show patient ID and name in event and sample lists
* Save column selection in the saved search
* #112: Improve the filemaker migration


.. _v0-33-0:

0.33.0 – 30/07/2015
-------------------

Bug fix release.

* Bug fixes

  * #126: Fix display of dates in wrong timezone
  * #127: Allow authenticated download of file attachments from production server
  * #129: Fix problem where no previous versions of objects were shown
  * #131: Fix race error when updating user prefs for the first time
  * #132: Correct initial container selection when making sample move transaction
  * #133: Sample edit form was saying decimal numbers were invalid
  * #136: After auto-logout, need to click login button twice

* Enhancements

  * #124: Port more frontend code to Typescript and adjust build process accordingly
  * #125: Allow filtering patients by event fields and vice-versa
  * #128: Add locking of records to prevent simultaneous updates overwriting each other
  * #130: Preserve state of expanded/collapsed sections across navigation
  * #134: Keep current search query when navigating around
  * #135: Allow saving and recalling search queries

.. _v0-32-0:

0.32.0 – 16/07/2015
-------------------

Bug fix release.

* Bug fixes

  * #27: Need to show a message while saving things
  * #102: Make Django database migrations run quicker
  * #103: Disassociate User model from Person
  * #104: Misc bug fixes F12
  * #107: Improve token auth SMS
  * #122: Better query filtering for user and sample

* Enhancements

  * #30: Implement patient case admin
  * #46: Split sample type field into multiple fields
  * #105: Tell users why they were auto-logged out
  * #106: Prevent chrome from remembering password, add option for remembering e-mail
  * #108: Add database models for Treatment and Intervention
  * #109: Improve appearance of login screen, add loading state and error handling
  * #110: Redesign frontend layout
  * #111: Add more fields to specimen
  * #112: Improve Filemaker migration of specimen, treatment, intervention
  * #113: Add study field to event
  * #114: Show report results on front page of study
  * #115: Implement specimen transactions
  * #116: Error handling when saving records, and notify on success
  * #117: Allow alphabetical grid co-ordinates in containers
  * #119: Show study member counts on home page
  * #120: Implement admin page for studies
  * #121: Allow archiving of studies, hide archived studies
  * #123: Allow admin editing of biobank containers


0.31.0 – 02/07/2015
-------------------

Bug fixes and improved query.

* Bug fixes

  * #94: Restoring revisions with dob/dod caused error
  * #100: Incorrect age was shown on patient detail page

* Enhancements

  * #92: Change label design to look like current labels
  * #93: Allow printing a series of labels by generating a PDF
  * #95: Progress bar and error handling for file uploads
  * #96: Add a URL redirect for any record ID
  * #97: Add event ID field which isn't table pk
  * #98: Show more information about patient consent and make it more consistent
  * #99: Allow patients to be consented into new studies
  * #101: Add an auto-complete dropdown to search entry


0.30.0 – 18/06/2015
-------------------

Turtle FileMaker data export and Turtleweb data import – database migration.

* Bug fixes

  * #91: Search stopped working

* Enhancements

  * #90: Script to export data from FileMaker and import into Turtleweb


0.29.0 – 04/06/2015
-------------------

CSV export and import.

* Bug fixes

  * #89: Assorted minor bug fixes

* Enhancements

  * #83: Allow sorting of grid columns
  * #84: Allow selection of grid columns for display and export
  * #85: Export search results to CSV format
  * #86: Automatically set page size of grid based on browser window height
  * #87: Show patient studies and cases on the detail page
  * #88: Allow importing patient data from CSV


0.21.0 – 20/05/2015
-------------------

User management, access control, audit logging, object versioning.

* Bug fixes

  * #68: Fix admin site login form
  * #71: Fix problem with session idle timeout when app is open in multiple tabs
  * #77: Stale CSRF token cookies causing problems saving records
  * #80: Field ordering gets reset to alphabetical when editing event type
  * #82: No event fields visible if patient doesn't have a case set

* Enhancements

  * #65: Enable SQL explorer queries
  * #66: Allow users to reset their password through e-mail
  * #67: At login form, allow users to request help from site administrators
  * #69: Implement level-based access control
  * #70: Add user management
  * #72: Add read/write access logging to database records
  * #73: Add logging of user login attempts
  * #74: Automatically save revisions of selected database tables
  * #75: Allow restoring old versions of certain records
  * #76: Improve handling of errors in frontend
  * #78: Show username on file uploads
  * #79: Send system logs to logstash
  * #81: Also allow attaching files to event records


0.20.0 – 07/05/2015
-------------------

Event query.

* Bug fixes

  * #51: List of fields incorrect when patient has multiple cases
  * #54: Allow multiple event types to have the same name
  * #62: Improve appearance of study group patient list

* Enhancements

  * #45: Add time field to event record
  * #49: biobank: Allow adding multiple samples at once
  * #50: Show patient samples grouped by event
  * #52: build: Update to Python 3.4
  * #55: Allow ordering of event fields
  * #59: Add screen for searching by event
  * #60: Allow attachment of files to patient record
  * #61: Allow searching on custom event fields
  * #63: Allow removal of patients from study groups
  * #64: Present possible duplicate patients when adding new record


0.19.0 – 22/04/2015
-------------------

Improvements to sample inventory.

* Bug fixes

  * #34: Date ranges getting munged when using expanded query form
  * #35: Assorted bug fixes
  * #36: Prevent cascading deletes of patient records
  * #38: Search returns no results when query syntax is slightly wrong

* Enhancements

  * #37: Build and library improvements
  * #39: biobank: Initial rendering of sample labels and barcodes
  * #40: biobank: Improve appearance of biobank location browser
  * #41: biobank: Allow searching and listing of samples
  * #42: biobank: Add screen for viewing a sample
  * #43: biobank: Improve buttons for adding transactions to samples
  * #44: biobank: choose most recently used location as initial location for new samples


0.18.1 – 27/03/2015
-------------------

Bug fix release.

* Bug fixes

  * #32: Biobank container list is really slow to load
  * #33: List of drop-down lists in admin is slow to load


0.18.0 – 25/03/2015
-------------------

Initial version of biosample inventory.

* Bug fixes

  * #28: When editing DDLs, blank items get removed
  * #29: Control for setting a title/salutation on patient doesn't work

* Enhancements

  * #31: Implement sample biobank module


0.17.1 – 11/03/2015
-------------------

Bug fix release.

* Bug fixes

  * #26: When logging in, users can't know if their password was incorrect or the token sms failed to send


0.17.0 – 10/03/2015
-------------------

Defining event fields and value lists. Categorization of patients
within study by "case".

* Bug fixes

  * #4: Disable browser auto-fill on patient form, etc
  * #18: Problems with search query date ranges and search form and reports
  * #25: Site auto-logs-out after 1 minute on Firefox

* Enhancements

  * #19: Improve look of patient grid and use it for showing study groups
  * #20: Allow editing of items in drop-down lists 
  * #21: Specialize event types by study
  * #22: Allow editing tree of event types
  * #23: Add screen for defining event fields
  * #24: Allow setting patient "case" and filter event fields based on case


0.16.1 – 26/02/2015
-------------------

Bug fix release.

* Bug fixes

  * #17: Site won't work if users don't refresh/clear browser cache


0.16.0 – 25/02/2015
-------------------

Studies and patient events.

* Bug fixes

  * #1: Make login e-mail case-insensitive
  * #2: Can't create studies/reports after logging in
  * #3: Patient list: show DOB in correct format
  * #11: Make patient address entry work better and fix display of addresses
  * #16: Clicking Biobank button crashes the app

* Enhancements

  * #5: Change wording of study, etc
  * #6: Don't need family fields for patients
  * #7: Add patient cause of death field
  * #8: Differentiate between blank fields unknown and simply not entered
  * #9: Link to cancer registry by registry number
  * #12: Allow events to be added to the patient record
  * #13: Auto-logout users after 10 minutes idle
  * #15: Add hospitals database model

* Open issues

  * #4: Disable browser auto-fill on patient form, etc


0.15.0 – 11/02/2015
-------------------

Initial demo prototype.

