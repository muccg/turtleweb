'use strict';

var gulp = require("gulp");
var shell = require('gulp-shell');
var conf = require("./conf");

gulp.task('genapi', ['venv'], function() {
  return gulp.src('')
    .pipe(shell([conf.backendShell("gen_api_bindings -o frontend/app/crud/genapi.ts")]));
});
