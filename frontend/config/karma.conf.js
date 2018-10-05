module.exports = function(config){
  config.set({
    basePath : '../',

    files : [
      'bower_components/jquery/dist/jquery.min.js',
      'bower_components/bootstrap/dist/js/bootstrap.min.js',
      'bower_components/lodash/dist/lodash.min.js',
      'bower_components/moment/min/moment.min.js',
      'bower_components/angular/angular.min.js',
      'bower_components/angular-resource/angular-resource.min.js',
      'bower_components/angular-route/angular-route.min.js',
      'bower_components/angular-animate/angular-animate.min.js',
      'bower_components/restangular/dist/restangular.min.js',
      'bower_components/ng-grid/build/ng-grid.min.js',
      'bower_components/ng-grid/plugins/ng-grid-reorderable.js',
      'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
      'bower_components/jquery-ui/jquery-ui.min.js',
      'bower_components/fullcalendar/dist/fullcalendar.min.js',
      'bower_components/fullcalendar/dist/lang/en-au.js',
      'bower_components/angular-ui-calendar/src/calendar.js',
      'bower_components/angular-sanitize/angular-sanitize.min.js',
      'bower_components/angular-ui-select/dist/select.min.js',
      'bower_components/angular-ui-router/release/angular-ui-router.min.js',
      'bower_components/Chart.js/Chart.js',
      'bower_components/angular-chart.js/angular-chart.js',
      'bower_components/angular-ui-sortable/sortable.js',

      'bower_components/angular-mocks/angular-mocks.js',

      'js/*.js',
      'js/**/*.js',
      'test/unit/*.js'
    ],

    exclude : [
      'lib/angular*/angular-loader.js',
      'lib/angular*/*.min.js',
      'lib/angular*/angular-scenario.js'
    ],

    autoWatch : true,

    frameworks: ['jasmine'],

    browsers : [
        'PhantomJS'
      // , 'Chrome'
      // , 'Firefox'
    ],
    reporters : ['progress', 'junit'],

    plugins : [
      'karma-phantomjs-launcher',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-jasmine',
      'karma-junit-reporter'
    ],

    junitReporter : {
      outputFile: '/tmp/karma-results.xml',
      suite: ''
    }

})}
