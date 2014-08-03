'use strict';

angular.module('fdaApp')
  .directive('chartLines', function () {
    return {
      restrict: 'E',   
      template: '<div></div>', 
      scope: {data: '='},
      link: function postLink(scope, element, attrs) {
      	scope.$watch('data' , function(data){
    		    if(data.length>0){
              buildChart();
            }
    		});

        var margin = {top: 20, right: 0, bottom: 20, left: 25},
              width = 850 - margin.left - margin.right,
              height = 100 - margin.top - margin.bottom;

        var svg = d3.select(element[0].childNodes[0]).append('svg')
              .attr('width', width + margin.left + margin.right)
              .attr('height', height + margin.top + margin.bottom);

        var x = d3.time.scale().range([0, width]),
              y = d3.scale.linear().range([height, 0]);

        var xAxis = d3.svg.axis().scale(x).orient('bottom'),
            yAxis = d3.svg.axis().scale(y).orient('left').ticks(3, 's');

        var brush = d3.svg.brush()
            .x(x)
            .on('brush', brushed);

        var area = d3.svg.area()
              .interpolate('monotone')
              .x(function(d) { return x(d.key); })
              .y0(height)
              .y1(function(d) { return y(d.values); });

        var container = svg.append('g')
              .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');                

        container.append('g')
            .attr('class', 'x brush')
            .call(brush)
          .selectAll('rect')
            .attr('y', -6)
            .attr('height', height + 7);

        container.append('path')
          .attr('class', 'area');

        var xAxisG = container.append('g')
              .attr('class', 'x axis')
              .attr('transform', 'translate(0,' + height + ')');

        var yAxisG = container.append('g')
            .attr('class', 'y axis');

        function brushed() {
            console.log(brush.extent());
        }

        function buildChart() {                    
          var data = scope.data.map(function (d) {
            var midOfMonth = d.time.substr(0,6) + '15';
            d.time = d3.time.format('%Y%m%d').parse(midOfMonth);
            return d;
          });

          data = d3.nest()
                    .key(function(d) { return Date.parse(d.time);})
                    .rollup(function(d) { 
                     return d3.sum(d, function(g) {return g.count; });
                    }).entries(data);           
                                    
          x.domain(d3.extent(data.map(function(d) { return d.key; })));
          y.domain([0, d3.max(data.map(function(d) { return d.values; }))]);

          container.selectAll('.area')
              .datum(data)
              .attr('d', area);   

          xAxisG.call(xAxis);
          yAxisG.call(yAxis);

        }
      }
    };
  });

