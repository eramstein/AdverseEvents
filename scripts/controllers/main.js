'use strict';

angular.module('fdaApp')
  .controller('MainCtrl', function ($scope, Data) {
    $scope.wait = false;
  	$scope.dataFilter = {
      'date': ['[20040101+TO+20150101]'],
      'reaction':[],
      'source':[],
      'drugClass':[],
      'indication':[]
  	};
  	$scope.data = {
      totalCount: 0,
      byField:{
        'date':[],
        'reaction':[],
        'source':[],        
        'drugClass':[],
        'indication':[]
      }		
  	};
    $scope.loadData = function () {
      $scope.loadCounts();
      $scope.loadTotalCount();     
    };
    
    $scope.loadCounts = function (exceptField) {
      //for each key in $scope.data we get corresponding results from the Data service
      //(would be nice to do this in only one call to the API, but it's not possible at the moment)
      angular.forEach($scope.data.byField, function(value, key){
        if(key !== exceptField){
          //we ignore filter conditions on the field we are counting, to keep on displaying other values for that field
          var filter = angular.copy($scope.dataFilter);
          if (key !== 'date') {
            delete filter[key];
          }
          Data.getCounts(filter, key).then(function (response) {
            $scope.data.byField[key] = response.results;
          });
        }        
      });
    };

    $scope.loadTotalCount = function () {      
      //get count of all AEs within current filter
      Data.getTotalCount($scope.dataFilter).then(function (response) {
          $scope.data.totalCount = response;          
      });
    };

    $scope.filterChanged = function (field) {
      $scope.loadCounts(field);
      $scope.loadTotalCount();
    };

    //kick off visualizations - the directives will respond to the data change
    $scope.loadData();

  });
