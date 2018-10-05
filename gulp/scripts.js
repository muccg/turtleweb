'use strict';

var path = require('path');
var gulp = require('gulp');
var ts = require('gulp-typescript');
var browserSync = require('browser-sync');
var merge = require('merge-stream');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');

var conf = require('./conf');

var $ = require('gulp-load-plugins')();

var tsProject = ts.createProject(__dirname + '/../' + conf.paths.src + '/tsconfig.json', {
  "noExternalResolve": true,
  "sortOutput": true
});

gulp.task('scripts', ['typescripts', 'jison']);

gulp.task('typescripts', function() {
  var tsResult = gulp.src([
    path.join(conf.paths.src, '/app/**/*.ts'),
    path.join(conf.paths.src, '/typings/**/*.ts')
  ])
    .pipe(sourcemaps.init())
    //.pipe($.tslint())
    //.pipe($.tslint.report('prose', { emitError: false }))
    .pipe(ts(tsProject)).on('error', conf.errorHandler('TypeScript'));

  return merge([
    tsResult.js
      .pipe(concat('index.module.js'))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve/app')))
      .pipe(browserSync.reload({ stream: true }))
      .pipe($.size()),

    tsResult.dts
      .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve/definitions')))
  ]);
});

var jison = require('gulp-jison');

gulp.task('jison', function() {
  return gulp.src(path.join(conf.paths.src, '/app/**/*.jison'))
    .pipe(jison({ moduleType: 'commonjs' }).on('error', conf.errorHandler('jison')))
    //.pipe(concat('parser.module.js'))
    .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve/app')))
    .pipe(browserSync.reload({ stream: true }))
    .pipe($.size());
});
