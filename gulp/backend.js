'use strict';

var gutil = require('gulp-util');
var gulp = require("gulp");
var child_process = require("child_process");
var shell = require('gulp-shell');
var qretry = require('qretry');
var http = require('http');
var Q = require('q');
var conf = require("./conf");

gulp.task('bootstrapdb', ['venv'], shell.task([
  conf.backendShell("migrate"),
  conf.backendShell("init")
]));

gulp.task("djangodev", ["venv"], function(done) {
  var django = child_process.spawn(conf.backend, ["runserver", "8001"], {
    stdio: ['ignore', process.stdout, process.stderr],
    env: process.env
  });
  var kill = function() {
    django.kill();
  };
  process.on("exit", kill);
  process.on("uncaughtException", kill);

  waitForServer(8001, done);
});

function waitForServer(port, done) {
  // block pipeline until server starts listening
  qretry(function() {
    return Q.Promise(function(resolve, reject) {
      http.get("http://localhost:" + port, function(res) {
        resolve();
      }).on('error', function(e) {
        reject(e);
      });
    });
  }, {
    maxRetry: 20
  }).then(done, done);

}

gulp.task('venv', [], shell.task(conf.paths.venv ? [
  "./scripts/ensure_virtualenv.sh " + conf.paths.venv
] : []));
