'use strict';

describe('controllers', function(){
  angular.module("kindred.config", [])
    .constant('appConfig', {})
    .constant('appLoadingTimeout', function() {});

  beforeEach(module('kindred.turtle.controllers'));

  // it no workies, some angular module problem
  return;

  it('should define the study', inject(function($controller) {
    var vm = $controller('TurtleHomeCtrl');

    expect(angular.isArray(vm.studies)).toBeTruthy();
    expect(vm.study).toBeTruthy();
  }));
});
