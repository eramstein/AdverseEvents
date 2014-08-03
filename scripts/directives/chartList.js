'use strict';

angular.module('fdaApp')
  .directive('chartList', function (Data) {
    return {
      templateUrl: 'views/tpllist.html',
      restrict: 'E',
      scope: {filter: '=', count: '=', wait: '='},
      link: function postLink(scope, element, attrs) {
        scope.currentRow=1;
        scope.currentPage=1;
        scope.rowsPerPage=20;
        scope.showDetailsPane=false;
        scope.data=[];
        scope.details={};
        //load the data in teh range of the current list's page
        scope.loadList = function () {
          scope.wait = true;               
          Data.getList(scope.filter, scope.rowsPerPage, (scope.currentPage-1) * scope.rowsPerPage).then(function (response) {
              scope.data = response;
              scope.wait = false;        
          });
        };
        //check if we need to reload new data while user browses by row   
        scope.rowChanged = function (index) {          
          if(index){
            scope.currentRow = index;            
          }
          if(scope.currentRow > scope.rowsPerPage && scope.currentPage < Math.floor(scope.count / scope.rowsPerPage)){
            scope.currentPage++;
            scope.loadList();
            scope.currentRow = 1;
          }
          if(scope.currentRow < 0 && scope.currentPage > 1){
            scope.currentPage--;
            scope.loadList();
            scope.currentRow = scope.rowsPerPage;
          }
          scope.showDetails();
        }; 
        //show details for a given row  
        scope.showDetails = function (){          
          scope.details = scope.data[scope.currentRow-1];
          scope.showDetailsPane = true;
        };   
        scope.hideDetails = function (){
          scope.showDetailsPane = false;
        };        
        scope.$watch('filter', function () {
          scope.loadList();
        });        
      }
    };
  });
