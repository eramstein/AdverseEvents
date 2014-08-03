'use strict';

angular.module('fdaApp')
  .directive('chartBarpie', function () {
    return {
      templateUrl: 'views/tplbarpie.html',
      restrict: 'E',
      scope: {data: '=', charttitle: '@', togglefilter: '='},
      link: function postLink(scope, element, attrs) {

        // ANGULAR stuff
        // ------------------------------------------------
        scope.chartType = attrs.chart;
        scope.chartData = [];

        scope.$watch('chartType' , function(data){
            if(data === 'bars'){              
              scope.bars();
            }
            if(data === 'donut'){              
              scope.donut();
            }
        });

        scope.$watch('data' , function(data){
            if(data.length>0){
              scope.chartData = scope.data.slice(0, 10).map(function (d) {
                  var newD = {
                    n:d.term,
                    v:d.count,
                    f:true
                  };
                  return newD;
              });
              buildChart();
            }
        });

        // D3 stuff
        // ------------------------------------------------

        //configuration, scales and helpers 
    		var m = [0, 90],
    		    w = 500,
    		    h = 250,
    		    labelsWidth = 150,
            labelsHeight = 30,
    		    barHeight = 20;

    		var duration = 1000,
    		    delay = 500;

    		var color = d3.scale.ordinal().range(['#98abc5', '#8a89a6', '#7b6888', '#6b486b', '#a05d56', '#d0743c', '#ff8c00']);

    	  var xScale = d3.scale.linear()		   
    		    .range([0, w - m[0] - labelsWidth]);

        var pie = d3.layout.pie()
            .value(function(d) { return d.v; });

        var arc = d3.svg.arc();

    		var svg = d3.select(element[0].childNodes[0]).append('svg')
    		      .attr('width', w)
    		      .attr('height', h)
    		    .append('g')
    		      .attr('transform', 'translate(' + 0 + ',' + m[1] + ')');

        //builds all elements       
        function buildChart () {               
          var max = d3.max(scope.chartData, function(d) { return +d.v;} );
          xScale.domain([0, max]);

    		  var g = svg.selectAll('g')
    		      .data(scope.chartData, function (d) {
    		        return d.n;
    		      });

    		  g.enter().append('g')
    		      .attr('class', 'symbol')
              .style('cursor', 'pointer')
              .on('click', function(d, i) {
                toggleFilter(i);                    
              });

          g.exit().remove();
    		  
    		  g.append('path')
    		      .data(function() { return pie(scope.chartData); });

    		  svg.selectAll('path')
    		    .style('fill', function (d, i) {
                if(scope.chartType === 'donut'){
                  return color(i);
                } else {
                  return 'steelblue';
                }
            })
            .attr('class', 'nofilter')
	          .attr('transitionDirection', scope.chartType)
    		    .transition()
    		      .duration(0)
    		      .tween('arc', arcTween);

    		  g.append('text')
    		    .attr('dy', '.35em')
    		    .attr('fill', 'black')
    		    .attr('text-anchor', 'middle')
    		    .attr('class', 'itemLabel')
    		    .text(function(d) { return d.n; });

    		  g.append('text')
    		    .attr('dy', '.35em')
    		    .attr('fill', 'white')
    		    .attr('text-anchor', 'end')
            .attr('class', 'itemValueLabel')
    		    .attr('visibility', function(d) { return xScale(d.v) > w/20 ? 'visible' : 'hidden' ;})
    		    .text(function(d) { 
                    var text;
                    if(max>=1000){
                        text = Math.round(+d.v/1000) + 'k';
                    }
                    else {
                        text = d.v;                         
                    }
                    return text;                   
                });  

            //once all elements are created, update their attributes    
            updateChart();
          }

          //builds all elements       
          function updateChart() {
            svg.selectAll('path')
                  .style('fill-opacity', function (d, i) {
                     return scope.chartData[i].f ? 1 : 0.3;
                  });
          }
          
          //function handling the bar to arc transformation
    		  function arcTween(d, i) {
            //returns a function used by the transition to compute text and paths attributes while interpolating from 0 to 1
    		    //we use a closure to keep track of the initial attributes values during the transition
    		    var path = d3.select(this),
    		        valueLabel = d3.select(this.nextSibling.nextSibling),
    		        valueLabelWidth = valueLabel.node().getComputedTextLength(),
    		        itemLabel = d3.select(this.nextSibling),
    		        itemLabelWidth = itemLabel.node().getComputedTextLength(),
    		        x0 = labelsWidth,
    		        y0 = (i+1) * (barHeight+1) - m[1],
    		        barLength = xScale(d.data.v),
    		        transitionDirection = d3.select(this).attr('transitionDirection');

    		    return function(t) {
    		      //t will go from 0 to 1 during the transition
    		      //for t=0 we have bars, and for t=1 we have a donut chart
    		      //the transitionDirection attribute of the paths indicate if we should go from bars to donut or vice versa - we use it to reverse t if needed
    		      switch(transitionDirection)
    		      {
    		        case 'bars':
    		          t = 0;
    		          break;
                    case 'donut':
                      t = 1;
                      break;
    		        case 'back':
    		          t = 1 - t;
    		          break;
    		      }

    		      //(original idea of interpolating on initially huge D3.js arcs is from Mike Bostock here: http://bl.ocks.org/mbostock/1256572)
    		      //the idea is to start with huge arcs (hundreds of thousands pixels radius), take a very small slice of them (start and end anles very close) and translate them back to the origin
    		      //this make it look like rectangles initially. initial all arcs have similar angles to keep the pseudo-rectangles aligned.
    		      //from there the arcs become smaller, the translation becomes smaller to keep them within the svg, and the angles get bigger so the arcs stay the same size and become curvier
    		      //all these parameters converge towards d, which is the {innerRadius, outerRadius, startAngle, endAngle} object coming from pie(data), and the arcs finally form a donut chart
    		      var r = (h / 2 - labelsHeight) / Math.min(1, t + 1e-4), //r is the radius of the arcs. starts huge and converges towards h/2 and some padding. note: the bigger bars you want, the bigger the initial arcs have to be to avoid anti-aliasing effects
    		          a = Math.cos(t * Math.PI / 2), //a is a cosinus scale (goes from 1 to 0, starts slow, then goes fast, then ends slow. used to change the arcs angles angles and rotate them
    		          yy = (-r + (a) * (y0) + (1 - a) * (h / 2)), //y position of the arcs. compensates for the arcs radius. starts at the initial rect position and converges to the center
    		          xx = ((a) * x0 + (1 - a) * w / 2), //x position of the arcs. starts at x0 and converges towards the center          
    		          f = {
    		            innerRadius: r - barHeight * (2 - a), // the radius difference converges towards double the bar height at radial speed. 
    		            outerRadius: r,
    		            startAngle: a * (Math.PI - barLength / r) + (1 - a) * d.startAngle, //d.startAngle is the target angle (we get there when t=1 and therefore a=0). we start at approx PI to have all bars aligned as the intial rectangles 
    		            endAngle: a * (Math.PI) + (1 - a) * d.endAngle
    		          },
    		          fl = { // a similar arc but with bigger radius, to position labels
    		            innerRadius: r - barHeight * (2 - a) + barHeight *  2, 
    		            outerRadius: r + barHeight *  2,
    		            startAngle: a * (Math.PI - barLength / r) + (1 - a) * d.startAngle, 
    		            endAngle: a * (Math.PI) + (1 - a) * d.endAngle
    		          },
    		          vlx = arc.centroid(f)[0] * (Math.pow(a,4) + 1) - 3*a + valueLabelWidth/2 * (1-a), //x pos of the value label. starts at 2 times thecentroid of the arc minus some padding (the right end of the bar) and converges towards the center of the arc. we also move it to the right for half of the text length to compensate for end text anchor 
    		          vly = arc.centroid(f)[1], //y pos of the value label. always the center of the arc
    		          vix = adjustLabelTextAnchor() + (1-a) * arc.centroid(fl)[0], //for the item labels we start at the left of the initial arcs, then converge towards the centroid of fl, which are similar arcs with bigger radius
    		          viy = a * arc.centroid(f)[1] + (1-a) * arc.centroid(fl)[1];
    		          
    		      //transform arc
    		      path.attr('transform', 'translate(' + xx + ',' + yy + ')');
    		      path.attr('d', arc(f));
    		      //move labels
    		      valueLabel.attr('transform', 'translate(' + vlx + ',' + vly + ')translate(' + xx + ',' + yy + ')');
    		      itemLabel.attr('transform', 'translate(' + vix + ',' + viy + ')translate(' + xx + ',' + yy + ')');      
    		      function adjustLabelTextAnchor(){
    		        //moves a label horizontally based on the angle of the arc, to avoid overlapping with the arcs
    		        var shiftX;
    		        var angle = f.startAngle + (f.endAngle-f.startAngle)/2; // center angle of the arc
    		        //we shift left or right based on the angle
    		        //it ranges to no shift when the label is on the center top or center bottom, to itemLabelWidth/2 shifts left or right when the label is respectively at the center right or center left
    		        //the max shift is itemLabelWidth/2 because the labels have middle text-anchors
    		        //this variation is used using the sinus of the angle, minus a to make sure the initial shift is -itemLabelWidth/2 (plus a little margin) while not interfering with the correct end positions (a=0 for t=1)      
    		        shiftX = (Math.sin(angle) - a) * (itemLabelWidth/2) - a * 5;    
    		        return shiftX; 
    		      }
    		    };
    		  }
        
          //functions triggering the transformations (using the scope to be triggered from the directive's template)
      		scope.donut = function() {
      		  svg.selectAll('path')      
      		      .attr('transitionDirection', '')
      		    .transition()
      		      .duration(duration)
      		      .style('fill', function(d, i) { return color(i); })
      		      .tween('arc', arcTween);

      		  svg.selectAll('.itemLabel')
      		      .data(function() { return pie(scope.chartData); })
      		      .transition()
      		      .delay(duration)
      		      .attr('visibility',function(d){
      		        var visibility = 'visible';
      		        if(d.endAngle-d.startAngle<Math.PI/20){
      		          visibility = 'hidden';
      		        } 
      		        return visibility;
      		      });
      		};

      		scope.bars = function() {
      		  svg.selectAll('path')      
      		      .attr('transitionDirection', 'back')
      		    .transition()
      		      .duration(duration)
                    .style('fill', 'steelblue')
      		      .tween('arc', arcTween);

      		    svg.selectAll('.itemLabel')
      		      .attr('visibility','visible');
      		};

          //function triggering filter changes
          function toggleFilter (index) {
              var selectedCount = scope.chartData.filter(function (d) {
                  return d.f;
              }).length;
              //if it's the first to be selected, unselected all others before
              if(selectedCount===scope.chartData.length){
                  scope.chartData = scope.chartData.map(function (d) {
                      return {n:d.n, v:d.v, f:false};
                  });
              }
              //toggle filter value
              scope.chartData[index].f = !scope.chartData[index].f;
              //if it was the only selected before, re-select all
              if(selectedCount === 1 && scope.chartData[index].f === false){
                  scope.chartData = scope.chartData.map(function (d) {
                      return {n:d.n, v:d.v, f:true};
                  });
              }
              //update chart
              updateChart();
              //trigger main scope filter function
              scope.togglefilter(attrs.field, scope.chartData[index].n);
          }
      }
    };
  });
