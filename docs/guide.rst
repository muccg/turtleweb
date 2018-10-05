.. _guide:

Turtleweb User Guide
====================

Introduction
------------

What Turtleweb Is
~~~~~~~~~~~~~~~~~

Turtleweb is a hospital patient database with a focus on medical
research. It allows collection of basic patient demographics, as well
as detailed information about biological specimens which have come
from the patient. The database can be queried to determine suitable
candidates for further study, or to gather statistics about patients
and their specimens. Turtleweb is designed to be secure to protect
confidential patient data from inappropriate or unconsented use.

How Turtleweb Works
~~~~~~~~~~~~~~~~~~~

Turtleweb is a web site accessed through a web browser. The actual
database is on a central server computer, so no data is stored on the
user's own computer. Because Turtleweb is implemented as a web site,
it can also be accessed from a tablet device if necessary, so long as
the tablet is able to connect to the hospital's private network.


About This Document
~~~~~~~~~~~~~~~~~~~

After reading or skimming through this guide, users should be able to
use all functions of Turtleweb.

As far as possible, Turtleweb's UI (user interface) is intended to be
self-explanatory, or have the necessary instructions nearby. However,
the usability of the application could always be improved.

This user guide will provide an overview to users who have never used
Turtleweb before, and help for users who need to know how to operate a
certain function.

Basic Operation
---------------

Turtleweb works like many other web sites on the Internet. You enter
the URL, log in using a form. The blue links are there for clicking,
and you can navigate backwards with the browser's back button.

Multiple sessions can be opened in browser tabs or windows.

There are also buttons which, when clicked, do things or go to
places. Changes you make will take effect when the "Save" button is
clicked. If there is no "Save" button, then the change will happen
immediately. Usually Turtleweb will ask for confirmation before
performing destructive operations.

.. _database:

The Database
~~~~~~~~~~~~

The application is arranged in a broadly hierarchical way, with
different sections and sub-sections, and with records having
sub-records attached, etc.

.. graphviz::

   digraph Database {
      db -> studies -> patients -> events -> samples; 
      studies -> groups -> patients2;
      studies -> reports;
      studies -> searches;
      db -> biobank -> container -> samples2;
      container -> container;
      db -> files;
      db -> users -> logs;

      patients -> patients2 [dir=none,style=dotted,constraint=false];
      samples -> samples2 [dir=none,style=dotted,constraint=false];

      db [label="Turtleweb Database",shape=polygon,sides=4];
      studies [label="Studies",shape=polygon,sides=5];
      patients [label="Patients"];
      events [label="Events"];
      samples [label="Samples"];
      groups [label="Study\nGroups"];
      patients2 [label="Patients",style=dashed];
      reports [label="Reports"];
      searches [label="Saved\nSearches"];
      biobank [label="Biobank",shape=polygon,sides=6];
      container [label="Container",shape=polygon,sides=4];
      samples2 [label="Samples",style=dashed];
      users [label="Users"];
      logs [label="Access\nLogs"];
      files [label="File\nAttachments"];
    }

All patient records belong to a study, and the study is the top-level
filing cabinet which records are put into. When viewing a study, you
will only see records belonging to that study.

However, when browsing the Biobank, all specimens from all studies are
shown.

How it looks
~~~~~~~~~~~~

.. figure:: images/home.*
   :scale: 50 %
   :align: center
   :alt: The main screen

   The main screen of Turtleweb.

The Turtleweb screen is divided up into different areas as illustrated
in the above diagram.

1. Page title and navigation

   This shows the name or title of the current record or page. For
   example it will show the patient's name and ID number when viewing
   the patient record.

   It also provides "bread crumb" links to access parent sections and
   records.

   Clicking the turtle will always navigate back to the start page.

2. Section nav

   This allows immediate access to different sections of the
   application.

   a. Groups – :ref:`study-groups`
   b. Patients – :ref:`editing`
   c. Events – :ref:`events`
   d. BioBank – :ref:`biobank`
   e. Reports – :ref:`reports`
   f. Admin – :ref:`admin`
   g. Help – links to this document, :ref:`guide`

   While viewing a certain area of the application, sub-section menus
   may be shown beneath the section button.

   On smaller screens, this navigation will appear at the bottom of
   the page, rather than the side.

3. Studies

   This list allows quick navigation to one of the active studies (see
   :ref:`studies`).

4. User menu

   This drop-down menu allows the user to edit their details as
   described in :ref:`user-accounts`.

5. Quick search

   The quick search box allows searching within the current study,
   without having to specify what type of record should be
   searched. See :ref:`search`.

6. Main area

   The main area is the space where the current record or page will
   be displayed. If the web browser window is resized, its content
   will expand and flow to fill the available space.

7. Buttons

   On certain pages, buttons are shown. These perform actions such as
   "Edit", "Save", "Delete", etc.

   The buttons are located to the right on normal screens and below on
   smaller screens.

8. Software version

   The software version increases if anything has changed in the
   application. Full details can be obtained in the :ref:`changelog`.

9. Web browser location entry and controls

   The location entry and browser controls belong to the web browser
   and aren't strictly part of Turtleweb. However they can be used to
   navigate within Turtleweb.

   Many other web applications prevent normal use of these elements,
   but as far as possible, Turtleweb does not.

.. _tsearch:

Search
------

A key design goal of Turtleweb is convenient and powerful
searching. The results of a search are shown very soon after entering
it, and may be iteratively refined.

Search queries are formulated using a textual language from which very
specific searches can be expressed. Wielding such power requires more
effort from the user. However, the burden on the user is lightened
somewhat because the system prompts the user with the possible search
options and validates the query expression.

.. tip:: How to run a search

  First decide what type of records you would like to find:

  * Patient
  * Event
  * BioBank Sample

  Then go to the corresponding search page.

  Input the query into the text box and press enter or click "Search".

Simple queries
~~~~~~~~~~~~~~

.. figure:: images/empty-search.*
   :scale: 50 %
   :align: center
   :alt: Empty search query

   An empty search query.

The simplest query is the empty query. All records within the current
study will be returned.

Querying by name or record ID is done by entering the name or
record ID. Turtleweb will return any records which have a name (first
name, last name, etc) which contains the search word. For example,
searching for ``thom`` would return patients ``Thomson``,
``Thompson``, and ``Yorke``.

When multiple search terms are entered, they further limit and reduce
the number of records returned.

Browsing lists
~~~~~~~~~~~~~~

Depending on the query, a search could return anywhere from none to
thousands of results.

The result set is paged so that only a screenful of records appear at
once.

.. figure:: images/search-paging.*
   :align: center
   :alt: Search paging controls

   The paging controls. (todo: more pages)

The default page size depends on how big the browser window is, but a
fixed number of results per page can be shown using the drop-down
menu.

Next to the paging controls, the total number of records matching the
query is shown.


Sorting
~~~~~~~

.. figure:: images/sort-header.*
   :align: left
   :alt: Sort header

   The sort header of the ID column.

The result set can be sorted by one or more fields. Hover over the
table header and sort controls will appear. The arrows toggle sorting
in ascending or descending order.

The results are sorted first by the most recently clicked header.

A small arrow will appear next to column headers when sorting is used.


.. _columns-modal:

Displaying Columns
~~~~~~~~~~~~~~~~~~

Initially, a small set of fields are shown with the result set. To
adjust this, click on the |edit-columns-button| edit columns button.

.. |edit-columns-button| image:: images/edit-columns-button.*

.. figure:: images/edit-columns-modal.*
   :scale: 50%
   :align: center
   :alt: Edit columns modal

   The list of fields available for display.

From the columns window, individual fields can be added or removed
from the results table by ticking them on or off. To add or remove all
fields, click the button next to the *Show* header.

In the same way, most fields can also be added or removed from the CSV
export. The headers will be seen next time a CSV is saved (see
:ref:`csv-export`).

Finally, sorting of individual columns can also be controlled from
this window. If multiple sort columns are selected, it works the same
as when clicking headers in the results table -- the most recently
clicked field will be sorted first.


Field queries
~~~~~~~~~~~~~

By entering text in the search box, patients can be searched by
name. Searching can be done over any field by typing the field name
and a colon before the search text.

For example, to search for all male patients::

    sex:m

To search for those who are alive::

    deceased:false

To search for patients whose surname contains a word, use
``surname:``. To find patients whose surname is exactly "John"
(disregarding case of letters), use a double colon::

    surname::john

Ranges of birth dates and death dates are possible::

    dob:1950-1970

If two search terms are placed next to each other, then the result
will be all records in which both searches match. Search terms can
also be combined with the ``AND`` and ``OR`` operators. For example,
the following two queries are equivalent::

    sex:M dob:1950-1970
    sex:M AND dob:1950-1970

The ``OR`` operator will include results of both searches. For example
to search for patients whose given names are one of George, Ringo,
Paul::

    given:george OR given:ringo OR given:paul

To group search clauses logically, with different operators, surround
them in brackets::

    (given:John AND deceased:true) OR dod:2000-

To search for a missing value, leave the text after the colon
blank. For example, to find deceased patients with no date of death
entered::

     dod: AND deceased:true

Finally, to invert the result set, use the ``NOT`` operator. This
would find patients who have the name Ringo but not the surname
Starr::

    name:ringo AND NOT surname:starr

It doesn't matter whether the search terms are upper case or lower
case because the query engine ignores the difference.

There are more options for searching, which are described in
:ref:`query-language`.

If the query is written in a way which Turtleweb can't understand,
then it will highlight the search box in red and refuse to
search. Such confusion can be caused by using keywords which haven't
been defined or using ``AND`` with only one term.

.. figure:: images/auto-complete-1.*
   :scale: 75%
   :align: center
   :alt: Patient search auto-complete

   The auto-complete menu for patient search.

Once the search box is selected, a menu will appear showing the
possible keywords. The keyword can be selected by typing it, or by
clicking it in the menu.

If a value is expected, then a list of possible options will be shown.

.. figure:: images/auto-complete-2.*
   :scale: 75%
   :align: center
   :alt: Patient search auto-complete

   The value options for the *deceased* keyword.

The auto-complete menu can be dismissed by clicking the close button,
pressing the ESC key, or by clicking outside of the search box.

.. _csv-export:

Exporting to CSV
~~~~~~~~~~~~~~~~

The results of a query can be saved in CSV format for further
processing within a spreadsheet program.

This is done by choosing the fields to be exported (see
:ref:`columns-modal`), or just using the default set, then clicking
|save-csv-button|.

.. |save-csv-button| image:: images/save-csv-button.*
                             :alt: Save CSV

The browser will download the CSV into its downloads folder, where it
can be opened by a spreadsheet program. The downloaded file will have
the current date and time in its filename.

.. figure:: images/csv-libreoffice.*
   :scale: 75%
   :align: center
   :alt: LibreOffice CSV Import

   Loading a CSV file into LibreOffice.

The CSV will have the same records as the search which was displayed
when the *Save CSV* button was pressed.

.. _csv-import:

Importing from CSV
~~~~~~~~~~~~~~~~~~

Data from CSV tables can be imported into Turtleweb using the same
format in which they are exported.

To start importing a CSV, select *Import CSV* from the Patients
section of the navigation on the left-hand side of the screen.

The CSV file is usually selected from within the computer's folders.

As a shortcut, if a CSV has recently been selected, it will appear in
the list of previous CSV files.

.. figure:: images/import-csv-1.*
   :scale: 75%
   :align: center
   :alt: CSV Import 1

   Selecting a CSV file to import.

After loading the CSV file, Turtleweb will read part of it and then
ask how exactly the CSV data should correspond to the creation/update
of records.

.. figure:: images/import-csv-2.*
   :scale: 50%
   :align: center
   :alt: CSV Import 2

   Setting the options for importing a CSV file

For verification purposes, the filename, number of rows, etc. is
displayed in the *Input file statistics* box.

Each column of the CSV is listed in the *Column Mapping* table. This
defines which field (if any) will take the value of cells in that
column.

One of the columns can be designated as the *Key*. This is how rows in
the CSV are mapped to records in Turtleweb. If the key doesn't match
(e.g. because the key is blank), then a new record is created.

The ID field is a good candidate for use as a key.

It is possible to control how data is merged with the *Options* box.

The CSV import screen shows the first 10 rows of the CSV as an example
of how the data will be imported. If this is satisfactory then the
"Import Now" button can be used to write changes.


Saved Searches
~~~~~~~~~~~~~~

Commonly used queries can be saved for later by choosing *Save Search*
→ *Create Saved Search* from the search listing screen.

Once a name is chosen, the query will appear on the home page of the
study where it can be selected.

The sort order and columns displayed are also saved with the search.

If any changes to the search are required, then the *Save Search* →
*Update* option can be used.

Saved searches can be referred to in other searches using the
``search:`` keyword (see :ref:`query-language`).

.. _study-groups:

Study Groups
------------

Study groups are a list of patients kept for a project. They are like
saved searches, but the list will not change once it has been saved.

To create a study group, first run a query to get some patients. Then
select *Save Search* → *Add to study group*. The patients can form a
new study group, or be added to an existing study group.

.. figure:: images/study-group-add.*
   :scale: 75%
   :align: center
   :alt: Add Patients to Study Group

   The options for adding patients to a study group. The numbers (a/b)
   to the right of the study group are:

   a. how many patients in the search are already in the study group,
      and
   b. how many patients were in the search in total.

After selecting an option, the study group is presented for editing.

The study groups can be viewed and updated from the *Groups* section.

More patients are added to study groups through the search page.

To delete patients from a study group, go to the study group and
select the patients using the tick boxes. Then choose *Remove from
study group* from the selection menu.

To search within a study group, add the ``group:`` keyword to the
search. Groups can be filtered using ``AND`` or combined using
``OR``. For more details, see :ref:`query-language`.


.. _editing:

Editing
-------

Patient records are edited from the *Patients* section of the site

Adding a Patient
~~~~~~~~~~~~~~~~

After clicking the *Add Patient* button, a form is shown where basic
demographics can be entered.

Once sufficient information has been entered, the *Save* button can be
clicked to create the record.

Turtleweb checks for possible duplicate records while the form is
being filled out. It will try to match the surname, first name, sex,
and date of birth fields with patients who are already in the
system. It will show whatever it finds in the records of all patients
in all studies.

.. figure:: images/patient-duplicates.*
   :scale: 75%
   :align: center
   :alt: Possible duplicate patients

   A list of possible duplicate patients is shown when creating new
   patient records.

Selecting a record in the list of duplicate patients will bring up
that record for editing.

If the patient was a member of another study, it can be brought into
the current study by saving the record.

Patient consent
~~~~~~~~~~~~~~~

Patient consent is granted for a patient in a particular
study. Usually a patient belongs to just one study, but a patient can
belong to multiple studies if there are consent records.

Editing Patient Demographics
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Patient records can be edited by clicking the *Edit* button while
viewing the record.

When editing a record, the changes are not saved until *Save* is
clicked. After clicking *Save*, Turtleweb will say if the record was
successfully saved.

If any field values are missing or incorrectly formatted, the
offending field will be highlighted in red. When the form is invalid,
it is impossible to click the *Save* button.

To discard any changes to the record without saving, click the
*Cancel* button, or simply navigate to another part of the site.

.. _patient-case:

Patient Cases
~~~~~~~~~~~~~

Patients can be assigned one or "cases". These don't map directly to
any medical diagnosis, but are a way to classify patients within a
study.

The main effect of setting a case is limiting the fields which appear
on patient events. For example, some fields might be specific to the
site of a cancer. A case could be used to limit that field to only
patients who need it.

Reverting to old versions
~~~~~~~~~~~~~~~~~~~~~~~~~

.. figure:: images/versions.*
   :align: left
   :alt: Restore a version

   Selecting a version of the record to restore.

Turtleweb tracks changes to records and keeps old versions as a
backup.

Changes to records can be undone by restoring a previous version.

From edit screen, click *Versions*, then select a suitable
version. The edit form will be updated with values from that version.

To complete the revert, click *Save*.

Deleting Patients
~~~~~~~~~~~~~~~~~

To delete a record, first go to edit it. The *Delete* button will be
with the other buttons.

.. _events:

Adding patient events
~~~~~~~~~~~~~~~~~~~~~

.. figure:: images/add-event-menu.*
   :scale: 75%
   :alt: Add event menu

   When adding an event to a patient, its type must be nominated.

Events are the main way in which interesting data is attached to the
patient record.

To add an event to the patient, select an event type from the *Add
Event* drop-down menu. A form is then shown for editing the event
fields.

Every event has a date and time. The rest of its attributes are
determined by its type.

After saving the event, it will appear under the patient's list of
events. Each event in this list can be expanded to show its values.

Newly created events are attached the current study. However, the
events list shows events from all studies if the patient belongs to
multiple studies.

As previously illustrated in :ref:`database`, events have samples. A
sample record for the patient can be created by expanding an event in
the list, and clicking *Add Sample*. This will be explained further in
:ref:`biobank`.


Attaching files
~~~~~~~~~~~~~~~

.. figure:: images/event-buttons.*
   :scale: 75%
   :alt: Event buttons

   A button for attaching files

Files can be attached to most types of record by clicking the *Attach*
button and selecting a file from the computer.

After uploading, the files will appear immediately in the record's
list of files.

The number on the button is how many files have been attached to the record.


Locking
~~~~~~~

If two users edit the same record simultaneously, there could be a
conflict when they save their record. It is difficult to define whose
changes are the most up to date.

Turtleweb uses "optimistic locking" to prevent data loss in this
situation.

That is, if a user tries to save a record which has been saved by
another user session while they were editing it, Turtleweb detects
this situation and refuses to save.

.. figure:: images/locking.*
   :scale: 75%
   :align: center
   :alt: Locking warning

   Locking warning shown after simultaneous editing condition.

In this situation, refresh the page, make the edits again, and then
save.

.. note::

  Locking conflicts are unlikely to be a common occurrence.


.. _biobank:

BioBank
-------

The BioBank is an inventory of biological specimens. It tracks
specimens by their ID and stores information such as the location of
the sample, who it belongs to, and what has happened to it in the
past.

In Turtleweb, specimens/samples are attached to a patient through an
event. The event would be something like a surgery or blood
collection.

A sample's location is a position within a box on a rack, in a
freezer, etc.

.. figure:: images/sample-location.*
   :align: center
   :alt: Sample location

   The contents of a biobank box.

The BioBank can be searched by clicking on *BioBank* on the left-hand
side section navigation. Keywords can be entered in the search box, or
the sample locations can be browsed through.

The BioBank uses the concept of "transactions" to record things which
happen to samples. Examples of transactions are sample creation and
destruction. Each transaction has a time and date, and possibly a
user-supplied note.

Creating samples
~~~~~~~~~~~~~~~~

Before creating a sample, an event must exist. To create a sample,
find the list of events under the heading *Bio Specimens* on the
patient page, then click *Add Sample*.

When creating samples, the given type and sub-type determine the
visibility of some fields, as well as the units used for measurement.

More than one sample can be created at once by increasing the *Number
of Samples* spinner. Space will be provided to change the type,
sub-type and treatment of all samples, numbered 1–*n*.

After saving, the sample record is displayed. At this point it has one
transaction called "Created".

.. figure:: images/sample-detail.*
   :scale: 75%
   :align: center
   :alt: Sample details

   Initial information for a sample record.

Other transactions can be created using one of the *Actions* buttons.

.. figure:: images/sample-transaction-buttons.*
   :align: center
   :alt: Sample details

   Possible transactions which can be used on the sample.

Storing samples
~~~~~~~~~~~~~~~

Samples can be allocated a location at creation time, or later on
using the "Move" transaction.

.. figure:: images/move-sample.*
   :scale: 75%
   :align: center
   :alt: Move sample

   Adding a transaction to move a sample.

The sample move transaction records the new position of the sample, as
well as where it used to be.

Using/destroying samples
~~~~~~~~~~~~~~~~~~~~~~~~

A portion of the sample can be recorded as used. The amount used is
given in whatever units the sample has. When the transaction is saved,
the amount used will be subtracted from the sample's amount.

Destroying a sample is effectively the same as using all of it.

Sending away samples
~~~~~~~~~~~~~~~~~~~~

Sending a sample removes it from its storage location and marks it as
sent to the given collaborator.


Aliquotting samples
~~~~~~~~~~~~~~~~~~~

Samples can be subdivided, generating multiple new samples.

When creating the transaction, a total amount and number of
subdivisions needs to be provided. The total amount is how much to
take off the original sample. The number of subdivisions is how many
new samples to divide this total amount between.

If the subdivision total amount is the same as the original sample's
amount, then the original sample is marked as destroyed/completely
used.

The newly minted samples get their own barcode ID. Their creation
transaction links back to the original sample. The subdivision
transaction on the original sample links to each of its aliquots.


Notes
~~~~~

Other events of interest can be recorded in a note transaction. This
is just a free-form text comment field.


Printing labels
~~~~~~~~~~~~~~~

Label printing is a multi-step process in Turtleweb. To reduce
clicking around, multiple labels can be printed in one batch.

.. figure:: images/print-label-1.*
   :align: center
   :alt: Print label

   After clicking Print label.

First, click the *Print label* button on a sample. This won't do
anything except add the label to the list. Other sample labels can
also be added to the list.

.. figure:: images/print-label-3.*
   :align: center
   :alt: Print label

   More samples are added to the list.

Second, the *Print Now* button is used to generate a PDF containing
all the labels.

The PDF filename has the current date and time. Inside the document,
there is one page per label, and the pages are the same size as the
actual labels.

.. figure:: images/sample-labels-pdf.*
   :align: center
   :alt: PDF of labels

   Viewing the PDF containing the labels.

Finally, once the PDF file is open (e.g. in Adobe Acrobat Reader), use
the normal print facility (Ctrl-P) to send it to the label printer.

Some experimentation with the PDF print settings may be necesary in
order to correctly align the labels with their barcodes, etc.


Barcode scanning
~~~~~~~~~~~~~~~~

It could be helpful to automatically load the record in Turtleweb when
a barcode is scanned.

This is possible on Android devices with cameras; see
:ref:`barcode-scanner-setup` for instructions.

Scan a sample barcode and use the *Custom Search* button and then
Turtleweb should load the record.

.. figure:: images/barcode-scanner.*
   :scale: 50%
   :align: center
   :alt: Barcode scanner

   The barcode scanner in action. This one is not actually scanning a
   printed label, but just one on the computer screen.


Editing containers
~~~~~~~~~~~~~~~~~~

Containers are arranged in a tree structure. The container classes are
the types of container at each level of the tree. A container can have
multiple samples, each with its own location.

Some containers are meant to hold a limited amount of samples, e.g. a
box. Some containers shouldn't hold samples, just other containers,
e.g. a freezer. Some containers hold an unlimited number of samples
without specific co-ordinates for each sample, e.g. a box of slides
sorted in numeric order.

.. figure:: images/container-admin.*
   :scale: 50%
   :align: center
   :alt: Container admin

   The BioBank container admin.

The container list is maintained through *Admin* →
*Containers*. Containers of each type can be added, changed, and
deleted. They can also be rearranged by dragging the boxes in the
lists.

To edit a container, move the cursor over it and click the *Edit*
button which appears.

.. figure:: images/container-admin-edit-location.*
   :scale: 50%
   :align: center
   :alt: Container admin

   Editing a location.

.. figure:: images/container-admin-edit-box.*
   :scale: 50%
   :align: center
   :alt: Container admin

   Editing a box.

The size of the container is specified as *width* × *height* × *depth*.
Whether the height and depth of the container are used
depends on the dimension of the container class.

There are some important details to consider when choosing container
dimensions.

* If the container should hold samples, then its
  *width* + *height* + *depth* should be greater than 0.
* If the container should have grid co-ordinates for its samples, then
  its *width* × *height* × *depth* should also be greater than 0.

.. figure:: images/containerclass-admin.*
   :scale: 50%
   :align: center
   :alt: Container class admin

   Editing the types of containers (container classes).

It's possible to change the structure of the biobank by editing
container classes, although this should be done with maximum caution.

However, the default size and grid co-ordinate labels can be
customized here.

.. figure:: images/containerclass-admin-edit-box.*
   :scale: 80%
   :align: center
   :alt: Edit box container class

   Editing the Box container class.

.. _printing:

Printing records
----------------

.. note:: Printing does not work very well at present.

   Not all UI elements are properly hidden in the printed version.

Patient records and lists can be printed using the standard web
browser print function. Usually the shortcut for this is Ctrl-P.

When printing lists, it helps to set the search page size manually to
something large so that the entire result set gets printed, rather
than the small amount which would fit in the browser window.


.. _query-language:

Turtleweb Query Language
------------------------

Turtleweb queries can be run on one of four types of entity:

* Patient
* Event
* Sample -- BioBank specimens
* User -- part of the :ref:`admin` section

A query is a series of search clauses joined with the logical
operators ``AND``/``OR``.

Because patients, events, and samples are linked in the database,
queries can reference linked records. For example, it is possible to
search for:

* patients that have a certain event(s)
* events that belong to a certain patient(s)

Structure of search clause
~~~~~~~~~~~~~~~~~~~~~~~~~~

A search clause takes the form::

    field:value

As a special case, ``value`` by itself is equivalent to ``name:value``.

The possible fields depend on what is being searched.

==========  ==========================
 Entity      Examples of a field
==========  ==========================
Patient     id, surname, dod
Event       id, date, type
Sample      id, stored_in, treatment
User        id, email, level
==========  ==========================

The possible values depend on the field.

===============  ===============================
 Example Field    Possible values
===============  ===============================
id               digits, P-*nnnnn*
surname          text
dod              a date range
treatment        one of the possible treatments
===============  ===============================

To find what fields can be searched on, browse through the
auto-complete menu which appears underneath the search
box. User-defined fields appear in the list as well as the built-in
fields. The auto-complete menu will also prompt for a value. For
example, it will list the possible treatments or give example date
ranges.

Searching text values
`````````````````````

To search for a blank value for a field, use::

    field:

Text values are actually searched as substrings, so all records which
contain the given text in that field are returned. For example,
searching for ``colour:re`` will return records with ``red`` as well
as ``ochre``. To search for exact values, use the double-colon::

    colour::re

Search terms are separated by spaces. If the search value needs to
have a space, it can be enclosed in double quotes::

    confused::"sort of"

Date ranges
```````````

Dates can be expressed as an open or closed range, or as a single
year, month, or day. These are some of the possibilities:

================  ==========================  =============================
 Date              Result                      Equivalent to
================  ==========================  =============================
dob:2000          Born in 2000                dob:01/01/2000-31/12/2000
dob:-2000         Born in 2000 or before      dob:-31/12/2000
dob:2000-         Born in 2000 or later       dob:01/01/2000-
dod:31/8/1997     Died on August 31, 1997     dod:31/08/1997-31/08/1997
date:6/2015       Date was in June 2015       date:01/06/2015-30/06/2015
date:7/2015-2015  Date was in Q3/Q4 2015      date:01/07/2015-31/12/2015
date:11/9/2001-   Date is post-September 11   date:11/09/2001-
================  ==========================  =============================


Boolean
```````

Named after the logician George Boole, boolean values can be either
true or false.

=======  =========================
 Value    Searched by
=======  =========================
True     true, t, yes, y, on, 1
False    false, f, no, n, off, 0
=======  =========================

Linked Data
~~~~~~~~~~~

It's often necessary to search by the fields of related records. For
example, searching for samples which belong to a deceased
patient. This is expressed as a **sample** search::

    owner.deceased:true

To search for **patients** which have a surgery event::

    event.type:surgery

To search for **events** containing a DNA sample, attached to a
patient born before 1950::

    sample.type:"Nucleic Acid" AND patient.dob:-1950

To search for **patients** having a DNA sample::

    event.sample.type:"Nucleic Acid"

All fields of the related record can be searched, and the
auto-complete menu will show which are available.

Operators
~~~~~~~~~

Search operators join clauses. If two clauses are written next to each
other, then ``AND`` is assumed. It may be simpler to omit the ``AND``
if there are a lot of clauses, but this document retains them for
clarity.

============  =====================================
 Operator      Returns records...
============  =====================================
*a* AND *b*   matching both *a* and *b*
*a* OR *b*    matching either *a* or *b*, or both
NOT *a*       which don't match *a*
============  =====================================

Brackets can be used to group together clauses and make complex
logical expressions. For example::

    ((colour:blue OR colour:red) AND size:medium)
    OR
    (size:large AND NOT colour:yellow)

Searching within searches
~~~~~~~~~~~~~~~~~~~~~~~~~

It's possible to combine the results of previously saved searches. For
example, if there is a saved search on **patients** called "Difficult
Patients", it can be shown whether "Fred" is one of them::

    search:"Difficult Patients" AND given:Fred

To search for **events** belonging to the difficult patients, use::

    patient.search:"Difficult Patients"

The auto-complete menu will show the available saved searches.

To search for **patients** within the members of study groups, use the
``group:`` keyword::

    group:"My cohort" AND deceased:false

Using saved searches and study groups is a good way of simplifying
searches and saving effort.

Study Membership
~~~~~~~~~~~~~~~~

When searching, only records belonging to the current study are
shown. To find patients which belong to the current study, as well as
another study, use the ``study:`` keyword.

The ``case:`` keyword can be used to filter by patient cases (see
:ref:`patient-case`), if these are used in the study.

The ``consent:`` keyword filters by patient consent within the current
study.

Example searches
~~~~~~~~~~~~~~~~

These tend to be quite complicated with quite detailed selection
criteria as specified by the researcher

CRC
```

For Example – current NOTCH Project

Selection Criteria for the cohort was:

Diagnosis: Adenocarcinoma – any sort

Stage III – this is equivalent to NCCN staging (T1,2, 3 or 4, N1
or 2, M0)

The T and N staging is from the pathology report, the M staging
from the surgeon’s notes, sometimes the pathology report. (T=a
measure of tumour invasion, N=measure of the tumour spread to
lymph nodes and M is a measure of spread to distant sites.

Primary site: Includes Caecum, Ascending Colon, Hepatic Flexure,
Transverse Colon, Splenic Flexure, Descending Colon, Sigmoid
Colon, Recto-sigmoid Junction (or exclude Rectal and Anal
Tumours)

Required the primary surgery to have been performed before a date
that would make 3 years of follow-up/outcome data available.

Required some knowledge of whether the patient had received any
chemotherapy as they wanted a cohort of treated and untreated
cases.  Exclude neo-adjuvantly treated patients (Chemo/Radiation
before surgery)

Search for events with the following query::

    ((stage:N1 OR stage:N2) and stage:M0) AND
    (primary_site:colon OR primary_site:hepatic OR ...) AND
    date:-2012

Save the search as "Notch Criteria", then try the following
refinements::

    search:"Notch Criteria" AND patient.treatment:chemo
    search:"Notch Criteria" AND NOT patient.treatment:chemo

Patient treatments are not yet implemented. Exclusion of neo-adjuvant
patients is tricky.

WAGO
````
To run this search:

- Low-grade endo-metrial cancers
- Last 2 years
- Have had a surgery
- Have these samples
  - Formalin-fixed paraffin
  - Blood sample

Search for events with the following query::

    study:wago grade:low date:2013- type:surgery sample.type:ffp sample.type:blood


.. _reports:

Reports
-------

A report is like a saved search where the number of results is
counted, possibly grouped by a criteria.

.. figure:: images/report-front-page.*
   :align: center
   :alt: Reports on home page

   A selection of reports can be shown on the home page of the study.

.. figure:: images/report-groups-bar.*
   :alt: Bar chart

   Patients grouped by date of birth with results in a bar chart.

.. figure:: images/report-groups-pie.*
   :alt: Pie chart

   Patients grouped by sex with results in a pie chart.

Reports can be created from a search screen (choose *Save Search* →
*Create Report*), or from the list of reports screen.

.. figure:: images/reports-list.*
   :scale: 50%
   :align: center
   :alt: List of reports

   List of reports screen.

At present, the reports function is fairly basic. It can be improved
if there is a need.

More advanced reports can be created by exporting a CSV (see
:ref:`csv-export`) and processing it with a spreadsheet or R_.

.. _R: https://www.r-project.org/

.. _sql-explorer:

SQL Explorer
------------

The `Django SQL Explorer`_ is an advanced solution to querying the
database which can be used if Turtleweb itself is not powerful enough.

There are many possibilities for using this tool for those who can
write Structured Query Language (SQL) statements. For example:

* complex queries on any field
* custom reports
* data dumps
* security audits

For security reasons, it is only available to users with the
Administrator level (see :ref:`user-roles`). The link is under the
*Reports* section in the section navigation.

.. _`Django SQL Explorer`: https://github.com/epantry/django-sql-explorer/

.. _user-accounts:

User accounts
-------------

Only users of registered accounts can log in to Turtleweb.

.. _login:

Logging in
~~~~~~~~~~

.. figure:: images/login.*
   :scale: 50%
   :align: center
   :alt: Login

   The login screen.

.. figure:: images/auth-sms.*
   :scale: 20%
   :align: right
   :alt: Authentication SMS

   The second factor authentication SMS pin code.

Users are logged in using their e-mail address and password. After
entering the correct credentials, a SMS is sent to the user's mobile
phone number. The six-digit code from this SMS needs to be entered in
order to complete the log in.

The SMS code is used so that if the user's password is stolen/guessed,
an attacker still won't have enough information to gain entry to the
system.

Editing profile
~~~~~~~~~~~~~~~

.. figure:: images/user-menu.*
   :align: center
   :alt: User menu

   Menu for the logged in user.

Essential details about the user can be updated by the user
themselves. The profile page is available through the menu in the
upper right-hand corner of the screen.

.. figure:: images/user-profile.*
   :scale: 50%
   :align: center
   :alt: User profile

   Editing the user's profile.

Users cannot change their own role, unless they are
administrators. Nor can they disable token authentication, unless they
are user managers (see :ref:`user-roles`). All the other details can
be changed.

Changing password
~~~~~~~~~~~~~~~~~

If a new password is entered in the profile form, the user will be
required to confirm that password. It will also be checked against the
password strength rules (see :ref:`pwpolicy`).

When saving, they will be prompted for their previous password. This
is a precaution against the hijacking of unattended sessions.

.. figure:: images/confirm-current-password.*
   :scale: 50%
   :align: center
   :alt: Confirm password

   Need to know the previous password in order to change password.

If the user has forgotten their password, or is newly added to the
system, they can reset their password using the link on the login
page (see :ref:`login`, :ref:`reset-password`).

Auto-logout
~~~~~~~~~~~

.. figure:: images/logout-warning.*
   :scale: 100%
   :align: center
   :alt: Auto logout warning

   A dialog pops up to inform the user that their idle session will be
   stopped.

Turtleweb uses an idle timer to determine when to auto-logout
users. This is to reduce the possibility of others using an account
while the computer is unattended.

If the Turtleweb browser tab is completely left alone for 10 minutes,
the session will be logged out. 30 seconds before that, a warning
message will be shown.

.. _admin:

User Administration
-------------------

Users can be created, deactivated, and modified in the *Admin* →
*Users* section. The list of users can be searched by name, e-mail
address, active status, or role.

.. _user-roles:

System roles
~~~~~~~~~~~~

Turtleweb defines five levels of access for users. This protects the
system and data by endowing users only with the minimum privileges
necessary to them.

The user roles and their privileges are as follows. A role has all
privileges of lower levels in addition to its own.

* Administrator

  - Can perform any action in the system.

* User Manager

  - Can create and modify user accounts.
  - Can assign user's own roles to other users.
  - Can deactivate user accounts.

* Data Analyst

  - Can define new fields, codes and values.

* Curator

  - Can add new records and edit existing records.

* User

  - Can view and query the database records.

.. _sysadmin:

In addition to the user roles defined within the Turtleweb system,
there is the external *System Administrator*. These people can log in
to the server which hosts Turtleweb or the SQL database server. System
Administrators handle installation and upgrades of the software, and
other maintenance tasks. They can view and/or change any record stored
by Turtleweb and there can only be limited logging of their actions.


Editing users
~~~~~~~~~~~~~

To edit a user, select it from the user list, then click *Edit User*
from the next screen.

Only User Managers and Administrators have access to the user
admin. User Managers aren't allowed to edit Administrators, or change
their own access level.

Users can also be deactivated from the user admin. This means that the
user will be unable to login and is effectively removed from the
system. For techinical reasons, it's not possible to completely delete
user records.

Creating new users
~~~~~~~~~~~~~~~~~~

Users can be created from the list of users screen using the *Create
User*. The process is the same as editing a user. Users can be
assigned a password, or it can be left blank, meaning that they will
need to reset it to gain access.

.. _reset-password:

Resetting passwords
~~~~~~~~~~~~~~~~~~~

A user can reset their own password from the login screen, or a user
manager can do it from the admin section.

To reset user passwords, select them by ticking their boxes in the
list. Then choose *Reset Password* from the selection dropdown.

.. figure:: images/admin-confirm-reset-password.*
   :scale: 50%
   :align: center
   :alt: Confirm reset password

   Resetting the password of selected user(s).

.. figure:: images/password-reset-ok.*
   :scale: 50%
   :align: center
   :alt: Password reset ok

   E-mails have been sent.

The e-mail will look like this::

    From: webmaster@staging.ccgapps.com.au
    To: test@test.com
    Subject: Password reset on Turtleweb
    Date: Thu, 03 Dec 2015 20:44:23 -0000


    You're receiving this email because you requested a password reset for
    your user account at Turtleweb.

    Please go to the following page and choose a new password:

    https://staging.ccgapps.com.au/demo-turtle/views/registration/reset/MTM/47e-12950291159a129c5f96/

    Your username, in case you've forgotten: test@test.com

    Thanks for using our site!

    The Turtleweb team

.. _pwpolicy:

Password Policy
~~~~~~~~~~~~~~~

.. figure:: images/password-expiry-warning.*
   :scale: 100%
   :align: center
   :alt: Password expiry warning

   The password expiry warning will appear after logging in.

User passwords expire 180 days from when they are changed. If the user
does not change their password before expiration, they will be unable
to log in.

The system will warn users 30 days before their password is due to
expire.

Passwords must have at least 8 characters, including a lowercase
letter, uppercase letter, and a digit.

Reviewing Audit Logs
~~~~~~~~~~~~~~~~~~~~

Turtleweb logs most actions of users such as reading and writing
records. The time and date are logged, as well as which record it was.

Both successful and unsuccessful logins, and their origin IP are
recorded.

These logs are shown on the user detail page within the admin section.

.. _studies:

Managing studies
----------------

Administrators can edit the list of studies, create new studies, and
archive unused studies.

.. figure:: images/admin-study.*
   :scale: 50%
   :align: center
   :alt: Study admin

   The list of studies

A study has a title, description, and slug. The slug is a short word
used to form the URL (web address) of the study.

Studies which have patient members can't be deleted, only
archived. Archived studies don't appear on the list in the section
navigation, and are hidden behind a toggle button on the front page.

To reorder studies, drag and drop the boxes up and down.

After editing, remember to click *Save* to update the database.


Customizing Fields
------------------

Turtleweb has a facility for defining custom fields and values. The
fields can be changed without the intervention of a software
developer, just by going into the *Admin* section of the site.

Field customization is limited to "Data Analyst" users (see
:ref:`user-roles`). A certain amount of care is recommended when
editing fields, because it's a complex task. The results of
customization should be checked to ensure the desired effect was
achieved.

Editing drop-down lists
~~~~~~~~~~~~~~~~~~~~~~~

.. figure:: images/ddl-edit.*
   :scale: 50%
   :align: center
   :alt: Drop-down list edit

   Editing a drop-down list.

There are a certain number of built-in drop-down lists whose values
can be edited. The user can also define new drop-down lists.

A new value can be added using the *Add Item* button and removed using
the cross button. The values can be reordered by dragging the handles
on the left-hand side of the table.

There are a few "special" drop-down lists, such as *Event Type*, or
*Container*. These have additional fields for editing and get their own
links under the section navigation.

Editing event fields
~~~~~~~~~~~~~~~~~~~~

.. figure:: images/admin-event-types.*
   :scale: 50%
   :align: center
   :alt: Event types admin

   Editing the *Event Type* drop-down list.

The event type determines what fields an event has. Event types are
arranged in a hierarchy, with sub-types "inheriting" fields from their
parents.

The tree of event types is set up by dragging around items by their
handle, and setting their indentation level. Click *Save* to commit
the changes before editing any fields.

.. figure:: images/event-type-fields.*
   :scale: 50%
   :align: center
   :alt: Event types fields

   Editing the fields of an event type.

Event types can be edited to change their name, applicable studies, or
fields. Event types apply to all studies by default, but a subset of
studies can be selected instead.

The event fields can be edited in the same way as :ref:`custom-fields`.

Patient Cases
~~~~~~~~~~~~~

.. figure:: images/admin-patient-case.*
   :scale: 50%
   :align: center
   :alt: Patient case admin

   Editing the list of patient cases.

Patient cases are edited like other drop-down lists, except that they
are assigned to a study. There can also be a default case for a study,
which new patients will automatically receive.


.. _custom-fields:

Custom Fields
~~~~~~~~~~~~~

Certain entities -- notably Patients -- can have custom fields defined.

The list of fields is shown in *Admin* → *Person Fields*.

Fields can be reordered by dragging their boxes around. They can be
edited by clicking the arrow next to the heading.

.. figure:: images/admin-event-type-field.*
   :scale: 66%
   :align: center
   :alt: Event type field

   Editing an event type field.

A field can have any text for its title. This is what's shown in the
editing forms.

The field's *name* is more important. This should be a series of
lowercase letters, digits, or underscores. The name is used when
storing data values, for search queries, and in CSV column headings.

The field type determines what is a valid value, and how it's
presented in the editing form.

============================  ===================================
 Type                          Meaning
============================  ===================================
Short Text                    Text with single-line input box
Long Text                     Text with multi-line input box
Integer                       Whole numbers
Decimal                       Decimal numbers
Boolean                       True/false values
Short list of possibilities   Drop-down menu
Drop-down list of names       Drop-down menu
Date                          Date
Date and Time                 Date and time
============================  ===================================

The difference between the *short list* and *list of names* is how the
values are defined. With the short list, the choices are edited
directly with the field. With the list of names, a drop-down list is
selected. The possible values of the drop-down list need to be edited
by through its separate admin page.

If *Value Required* is ticked, then the edit form can't be submitted
unless some value is provided for the field.

To add a field, use the button at the bottom of the screen. To remove
a field, expand its heading then click the cross button.

Django Admin
------------

.. figure:: images/django-admin.*
   :scale: 50%
   :align: center
   :alt: Error Modal

   The Django admin list of models.

The Django admin provides an avenue of last resort for an
administrator to edit records, when the normal UI doesn't work or is
missing a function. It is not particularly easy to use because its
layout reflects that of the underlying database.

It should generally be avoided, but nonetheless can be accessed from
the *Admin* section of the site.

Troubleshooting
---------------

.. figure:: images/error-modal-bad-request.*
   :scale: 75%
   :align: center
   :alt: Error Modal

   System is on fire.

Sometimes errors can occur due to programming mistakes, unanticipated
data inputs, IT failure, etc.

Turtleweb will usually report the errors to the user, and try to log
the error to the server (which will result in the development team
receiving an e-mail).

Sometimes there could be a silent error where, for example, the UI
doesn't respond to a button being clicked. If this happens, it may
help to refresh the browser tab and try to repeat the action.

In any case, it's best to advise the development team of the
circumstances leading up to the error. If the error prevents use of
the system, the developers may be able to provide a workaround, or fix
the bug.

.. note::

  The developer team contact address is turtleweb@ccg.murdoch.edu.au.
