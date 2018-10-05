Turtle FileMaker Data Migration
-------------------------------

This is done by exporting the data tables into CSV, loading these into
an intermediate PostgreSQL database, then transforming and copying the
records into the PostgreSQL database which Django uses.

CSV Export
==========

The data tables are accessed using the FileMaker ODBC driver on a
Windows PC (FMODBC32.DLL).

A python script running on the Windows PC connects using the
``pyodbc`` module, then writes the pertinent tables and columns and
into CSV files, which are bundled into a tar archive.

Intermediate PostgreSQL Tables
==============================

The tar archive containing CSV files is then loaded into an
intermediate PostgreSQL database which can be readily queried.

The schema of the intermediate database is like an approximate subset
of the Turtle FileMaker database. It is defined in the SQLAlchemy
table schema definition language.

The table schema drives the CSV import by determining what tables and
columns will be read from the files.

There are a limited number of foreign key constraints around the table
relationships. Unfortunately, many of the foreign key relationships
had dangling pointers, which prevented the addition of a constraint.

Turtleweb Django Tables
=======================

The main part of the migrations transforms tables into their Django
form. The transfer of each column in each table needs to be described
in the script's migration procedure.

The Django ORM is not used in this process. Instead, the schema is
reflected using the SQLAlchemy Automap module.

SQLAlchemy's table introspection facilities allow for certain
migration details to be determined implicitly from the database. The
transformation procedure can therefore be described briefly at a
fairly high level.


How to run it
=============

CSV Export Windows
~~~~~~~~~~~~~~~~~~

This assumes that the FileMaker ODBC driver is already installed and
is verified to work with the Turtle database.

Python 3.4 for Windows should be installed in a place such as
``c:\Python34``. Other programs which may be helpful are 7-Zip,
Notepad++, GPG4Win.

Open a ``cmd.exe`` shell and run::

    c:\Python34\Scripts\pip.exe install pyodbc

Clone the Turtleweb source code from git then ``cd`` to wherever the
checked out copy is.

Edit the config file in ``migrate/migrate.conf`` and set the ODBC
connection details.

Run the export script::

    c:\Python34\python.exe -m migrate.odbc_export -vv --conf migrate\migrate.conf -o ..\turtle.tar.bz2

Transfer the resulting tarball to a safe place for the next part of
the migration.

PostgreSQL CSV Load
~~~~~~~~~~~~~~~~~~~

Do it like this::
  createdb -O turtle turtle_import
  ./venv/bin/turtle-import -vv --conf migrate/migrate.conf -f turtle.tar.bz2

Turtleweb Migration
~~~~~~~~~~~~~~~~~~~

Do it like this::
    createdb -O turtle turtle
    django-admin migrate
    django-admin init
    turtle-migrate -vv --conf migrate/migrate.conf --continue --ignore-errors -x icd
    django-admin createinitialrevisions

Expected errors:

1. there should be a lot of null patient_id errors in link_pat_std
   because of dangling foreign keys.


Details about Turtle Schema
===========================

Naming conventions
~~~~~~~~~~~~~~~~~~

Format:    __kpu__ABC
Purpose:   Unique primary key (kpu) for table "ABC"
Example:   __kpu__PAT

Format:    _km__DEF
Purpose:   Match key (km) for table "DEF"
Example:   _km__EVE

Format:    __kpL__ABC_DEF
Purpose:   Primary "link" table key (kpL) for many-to-many relationship between tables "ABC" and "DEF"
Example:   __kpL__PAT_STD

Format:    _kZ__ZZX
Purpose:   System match key (kZ) for table "ZZX"
Example:   _kZ__ZZU

Format:    _ka__ExampleID
Purpose:   Alternate key (ka) with the name "ExampleID"
Example:   _ka__PatientID

Format:    _kft__RemoteID
Purpose:   Foreign table key (kft) with the name "RemoteID"
Example:   _kft__OldWartnAdmissionID


Table descriptions
~~~~~~~~~~~~~~~~~~

Look at the comments in ``migrate/tables.py`` about each table
definition.

Naming convention is as follows:

ZVL_ABC_X       ValueList for specific field
link_ABC_DEF    M2M relationship between tables ABC and DEF


Field descriptions
~~~~~~~~~~~~~~~~~~

Look in ``fields.csv`` and ``fields2.csv``.


About the migration script
==========================

1. Turtle table schema is defined in ``tables.py``.
2. ORM classes are setup with Automap, with the Django table
   definitions being reflected.
3. IDMap keeps new pk and old pk so that relationships can be resolved
   in the new tables.
4. IDMap is serialized to a django table and can be loaded to resume a
   migration.

Poking around data using SQLAlchemy
===================================

./venv/bin/python
from migrate.testing import *
Pat = BaseTurtle.classes.pat
session.query(Pat.__kpu__PAT, Pat._kft__OldWartnSubjectID)[:10]
