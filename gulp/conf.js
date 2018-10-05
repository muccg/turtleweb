/**
 *  This file contains the variables used in other gulp files
 *  which defines tasks
 *  By design, we only put there very generic config values
 *  which are used in several places to keep good readability
 *  of the tasks
 */

var gutil = require('gulp-util');
var minimist = require('minimist');

/**
 *  The main paths of your project handle these with care
 */
exports.paths = {
  src: 'frontend',
  dist: 'gulpdist',
  tmp: '.tmp',
  e2e: 'e2e',
  docs: 'docs'
};

/**
 *  Wiredep is the lib which inject bower dependencies in your project
 *  Mainly used to inject script tags in the index.html but also used
 *  to inject css preprocessor deps and js files in karma
 */
exports.wiredep = {
  // fixme: can exclude bootstrap.js if the angular-ui-bootstrap crap actually works
  //exclude: [/bootstrap.js$/, /bootstrap\.css/],
  exclude: [/bootstrap\.css/],
  directory: 'bower_components'
};

/**
 *  Common implementation for an error handler of a Gulp plugin
 */
exports.errorHandler = function(title) {
  'use strict';

  return function(err) {
    gutil.log(gutil.colors.red('[' + title + ']'), err.toString());
    this.emit('end');
  };
};

/**
 *  Config options passed on gulp command line.
 */
exports.options = minimist(process.argv.slice(2), {
  boolean: "online",
  string: "venv",
  default: {
    online: false,
    venv: process.env.VIRTUAL_ENV
  }
});

/**
 *  Paths for the django backend's virtualenv.
 */
exports.paths.venv = exports.options.venv
exports.backend = exports.paths.venv ? exports.paths.venv + "/bin/turtle" : "turtle";
exports.backendShell = function(args) {
  return exports.backend + " " + args;
};
