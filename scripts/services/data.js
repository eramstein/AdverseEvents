'use strict';

/*
This module connects to the openFDA API to fetch data on adverse events
It abstracts the specific syntax and nomenclature of the API
*/

angular.module('fdaApp')
  .service('Data', function Data($http) {
    //URL    
  	var fdaApiUrl = 'https://api.fda.gov/drug/event.json?';
    //code lists (labels corrsponding to the numbers the PAI sends back for certain fields)
    var codelists = {
      source:['Physician','Pharmacist','Other Health Professional','Lawyer','Consumer/non-health pro'],
      drugcharacterization:['Suspect drug','Concomitant drug','Interacting drug']
    };
  	//a dictionnary to map generic field names to openFDA API field names
  	var fieldNames = {
  		'drug':'patient.drug.openfda.generic_name.exact',
  		'reaction':'patient.reaction.reactionmeddrapt.exact',
      'source':'primarysource.qualification',
      'drugClass':'patient.drug.openfda.pharm_class_epc.exact',
      'indication':'patient.drug.drugindication.exact',
  		'date':'receivedate'
  	};
  	//transforms a generic filter array into a string used as a search parameter to send to the openFDA API
  	var buildSearchParam = function (filter) {
  		// filter has to be an object with this structure: {fieldA:["value1","value2"], fieldB:["value3","value4"]}
  		// this corresponds to (fieldA = value1 OR fieldA = value2) AND (fieldB = value3 OR fieldB = value4)
  		// OR statements across different fields are not supported (never seen a need for this, but can be added later)  		
  		var searchString = '';
      if(filter){
        angular.forEach(filter, function(values, field){
          if(values.length){
            searchString += searchString ? '+AND+' : '';
            searchString += '(' + fieldNames[field].replace('.exact','') + ':(';
            angular.forEach(values, function(fieldValue){
                if(codelists[field]){
                  searchString += '+'  + (codelists[field].indexOf(fieldValue)+1);
                } else {
                  searchString += '+'  + fieldValue;
                }                
            });
            searchString += '))';
          }          
        });
      }
  		return 'search=' + searchString;
  	};
  	//transforms a field name into a string used as a count parameter to send to the openFDA API
  	var buildCountParam = function (field) {  		
  		var countString = 'count=' + fieldNames[field];  		
  		return countString;
  	};

    return {
    	getCounts: function(filter, countOn) {
    		//returns a promise with AEs counts for a given field and filter
    		var url = fdaApiUrl + buildSearchParam(filter) + (filter ? '&' : '') + buildCountParam(countOn);
    		var results = $http.get(url).then(function (response) {
            var data = response.data;
            var nResults = data.results.map(function (d) {
              var nD = d;
              //clean up a bit some labels
              if(countOn === 'drugClass') {                
                nD.term = nD.term.replace(' [EPC]', '').replace(' Drug', '');                
              }
              if(countOn === 'indication') {                
                nD.term = nD.term.toLowerCase().replace('used for', '-').replace('use for', '-');                
              }
              //handle code lists
              if(codelists[countOn]){
                nD.term = codelists[countOn][d.term-1];
              }
              return nD;
            });
            data =  {
              meta:data.meta,
              results:nResults
            };            
		        return data;
		    });
		    return results;
      },
      getList: function(filter, limit, skip) {
        //returns AEs details for a given filter. limit and skip are used for paging (e.g. limit=25 & skip=0 will give the first 25)
        var url = fdaApiUrl + buildSearchParam(filter) + (filter ? '&' : '') + 'limit=' + limit + '&skip=' + skip;
        function formatIsoDate(d) {
          return d.substr(0,4)+'-'+d.substr(4,2)+'-'+d.substr(6,2); 
        }
        var results = $http.get(url).then(function (response) {
            var formattedData = response.data.results.map(function (d) {
              //format dates and numbers, handle code lists       
              d.receiptdate = new Date(formatIsoDate(d.receiptdate));
              d.receivedate = new Date(formatIsoDate(d.receivedate));
              d.transmissiondate = new Date(formatIsoDate(d.transmissiondate));
              if(d.primarysource){
                d.primarysource.qualification = codelists.source[d.primarysource.qualification-1];
              }                
              d.patient.drug = d.patient.drug.map(function (d) {
                  d.drugcharacterization = d.drugcharacterization ? codelists.drugcharacterization[d.drugcharacterization-1] : '';
                  d.drugstartdate = d.drugstartdate ? new Date(formatIsoDate(d.drugstartdate)) : '';
                  d.drugenddate = d.drugenddate ? new Date(formatIsoDate(d.drugenddate)) : '';
                return d;
              });
              d.patient.patientweight = d.patient.patientweight ? Math.floor(d.patient.patientweight) : '';              
              return d;
            });
            return formattedData;
        });
        return results;
      },
      getTotalCount: function(filter) {
        //returns AEs count for a given filter
        var url = fdaApiUrl + buildSearchParam(filter);
        var results = $http.get(url).then(function (response) {
          return response.data.meta.results.total;
        });
        return results;
      }
    };
  });
