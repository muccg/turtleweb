'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');

var browserSync = require('browser-sync');

function isOnlyChange(event) {
  return event.type === 'changed';
}

function eventStartTask(changeTask, otherTask) {
  return function(event) {
    if(isOnlyChange(event)) {
      gulp.start(changeTask);
    } else {
      gulp.start(otherTask);
    }
  };
}

gulp.task('watch', ['inject'], function () {

  gulp.watch([path.join(conf.paths.src, '/*.html'), 'bower.json'], ['inject']);

  gulp.watch([
    path.join(conf.paths.src, '/app/**/*.css'),
    path.join(conf.paths.src, '/app/**/*.less'),
    path.join('!' + conf.paths.src, '/app/**/.#*')
  ], eventStartTask('styles', 'inject'));

  gulp.watch([
    path.join(conf.paths.src, '/app/**/*.js'),
    path.join('!' + conf.paths.src, '/app/**/.#*')
  ], function(event) {
    gulp.start('inject');
  });

  gulp.watch([
    path.join(conf.paths.src, '/app/**/*.ts'),
    path.join('!' + conf.paths.src, '/app/**/.#*')
  ], eventStartTask('typescripts', 'inject'));

  gulp.watch([
    path.join(conf.paths.src, '/app/**/*.jison'),
    path.join('!' + conf.paths.src, '/app/**/.#*')
  ], eventStartTask('jison', 'inject'));

  gulp.watch([
    path.join(conf.paths.src, '/app/**/*.html'),
    path.join('!' + conf.paths.src, '/app/**/.#*')
  ], function(event) {
    browserSync.reload(event.path);
  });

  gulp.watch([
    path.join(conf.paths.docs, '/*.rst')
  ], eventStartTask('singleDoc', 'inject'));

});
