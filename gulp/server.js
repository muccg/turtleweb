'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');

var browserSync = require('browser-sync');
var browserSyncSpa = require('browser-sync-spa');

var util = require('util');

var proxyMiddleware = require('http-proxy-middleware');

function browserSyncInit(baseDir, browser) {
  browser = browser === undefined ? 'default' : browser;

  var routes = null;
  if(baseDir === conf.paths.src || (util.isArray(baseDir) && baseDir.indexOf(conf.paths.src) !== -1)) {
    routes = {
      '/bower_components': 'bower_components'
    };
  }

  var server = {
    baseDir: baseDir,
    routes: routes
  };

  server.middleware = proxyMiddleware([
    '/api',
    '/views',
    '/admin',
    '/explorer',
    '/static'
  ], {
    target: 'http://localhost:8001'
  });

  browserSync.instance = browserSync.init({
    startPath: '/',
    server: server,
    online: conf.options.online,
    open: false,
    browser: browser
  });
}

browserSync.use(browserSyncSpa({
  selector: '[ng-app]'// Only needed for angular apps
}));

gulp.task('serve', ['watch', 'djangodev', 'singleDoc'], function () {
  browserSyncInit([path.join(conf.paths.tmp, '/serve'), conf.paths.src]);
});

gulp.task('serve:dist', ['build', 'djangodev'], function () {
  browserSyncInit(conf.paths.dist);
});

gulp.task('serve:e2e', ['inject', 'djangodev'], function () {
  browserSyncInit([conf.paths.tmp + '/serve', conf.paths.src], []);
});

gulp.task('serve:e2e-dist', ['build', 'djangodev'], function () {
  browserSyncInit(conf.paths.dist, []);
});