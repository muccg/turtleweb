'use strict';

var gulp = require("gulp");
var path = require('path');
var shell = require('gulp-shell');
var merge = require('merge-stream');
var rename = require('gulp-rename');
var conf = require('./conf');
var browserSync = require('browser-sync');

gulp.task('docs', ['makeHtml', 'makeSingleHtml'], function() {
  var all = gulp.src([path.join(conf.paths.docs, '/_build/html/**/*')])
    .pipe(gulp.dest(path.join(conf.paths.dist, '/docs/')));
  var single = gulp.src(path.join(conf.paths.docs, '/_build/singlehtml/index.html'))
      .pipe(rename("_single.html"))
      .pipe(gulp.dest(path.join(conf.paths.dist, '/docs/')));
  return merge(all, single);
});

/* makeHtml depends on makeSingleHtml to ensure that they don't run at
 * the same time. */
gulp.task('makeHtml', ['makeSingleHtml'], function() {
  return makeDoc("html");
});

gulp.task('makeSingleHtml', function() {
  return makeDoc("singlehtml");
});

function makeDoc(target) {
  return gulp.src('')
    .pipe(shell(["make -C " + conf.paths.docs + " " + target]));
}

// copy in a previously built doc for use with the dev server
gulp.task('singleDoc', ["makeSingleHtml"], function() {
  var html = gulp.src(path.join(conf.paths.docs, '/_build/singlehtml/index.html'))
    .pipe(rename("_single.html"))
    .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve/docs')));

  var images = gulp.src(path.join(conf.paths.docs, '/_build/singlehtml/_images/*'))
  .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve/docs/_images')));

  return merge(html, images); //.pipe(browserSync.reload({ stream: true }));
});
