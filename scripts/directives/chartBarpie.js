'use strict';

angular.module('fdaApp')
  .directive('chartBarpie', function () {
    return {
      templateUrl: 'views/tplbarpie.html',
      restrict: 'E',
      scope: {data: '=', filter: '=', charttitle: '@', filterchanged: '='},
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
              //keep top 10 items only, sort descending and format objects for the chart
              scope.chartData = scope.data.slice(0, 10)
              .sort(function(a, b){ return d3.descending(a.count, b.count); })              
              .map(function (d, i) {
                  var newD = {
                    n:d.term,
                    v:d.count
                  };
                  return newD;
              });
              //draw or update chart
              setAllTransitions('resize');
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

    		var color = d3.scale.ordinal().range(['#98abc5', '#8a89a6', '#7b6888', '#6b486b', '#a05d56', '#d0743c', '#ec7014', '#fe9929', '#feb24c', '#fec44f']);

    	  var xScale = d3.scale.linear()		   
    		    .range([0, w - m[0] - labelsWidth]);

        var yOrder = function (d) {
          var position = 0;
          angular.forEach(scope.chartData, function(value, key){
              if(value.n === d.n) {
                position = key;
              }
          });
          return position;
        };

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

    		  var items = svg.selectAll('.item')
    		      .data(pie(scope.chartData), function (d) {
    		        return d.data.n;
    		      });

          //ENTER
    		  var itemEnter = items.enter().append('g')
    		      .attr('class', 'item')
              .style('cursor', 'pointer')
              .on('click', function(d, i) {
                toggleFilter(yOrder(d.data));                    
              });

          itemEnter.append('path')
              .style('fill', function (d, i) {
                  if(scope.chartType === 'donut'){
                    return color(i);
                  } else {
                    return 'steelblue';
                  }
              })
              .attr('class', 'nofilter')
              .attr('transitionDirection', scope.chartType)
              .attr('transitionType', 'resize'); 

          itemEnter.append('text')
            .attr('dy', '.35em')
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .attr('class', 'itemLabel');

          itemEnter.append('text')
            .attr('dy', '.35em')
            .attr('fill', 'white')
            .attr('text-anchor', 'end')
            .attr('class', 'itemValueLabel');

          //UPDATE
          items.selectAll('path')
            .data(pie(scope.chartData), function (d) {
              return d.data.n;
            })
            .style('fill-opacity', function (d, i) {
                if(scope.filter.indexOf(d.data.n)>=0 || scope.filter.length===0){
                  return 1;
                } else {
                  return 0.3;
                }
            })
            .transition()
            .duration(duration)
            .tween('arc', transfoTween);

          items.selectAll('.itemLabel')
            .data(pie(scope.chartData), function (d) {
              return d.data.n;
            })
            .text(function(d) { return d.data.n; });

          items.selectAll('.itemValueLabel')
            .data(pie(scope.chartData), function (d) {
              return d.data.n;
            })
            .attr('visibility', function(d) { return xScale(d.data.v) > w/20 ? 'visible' : 'hidden' ;})
            .text(function(d) { 
                    var text;
                    if(max>=1000){
                        text = Math.round(+d.data.v/1000) + 'k';
                    }
                    else {
                        text = d.data.v;                         
                    }
                    return text;                   
            });

          //EXIT
          var itemExit = items.exit()
                .transition()
                .duration(duration)
                .attr('transform', 'translate(0,1000)')
                .remove();
    		  
        }

        
        //function handling the bar to arc transformation
  		  function transfoTween(d, i) {
          //returns a function used by the transition to compute text and paths attributes while interpolating from 0 to 1
  		    //we use a closure to keep track of the initial attributes values during the transition
          //note: "this" refers to the path element (see D3 docs about the tween function)
  		    var path = d3.select(this),
  		        valueLabel = d3.select(this.nextSibling.nextSibling),
  		        valueLabelWidth = valueLabel.node().getComputedTextLength(),
  		        itemLabel = d3.select(this.nextSibling),
  		        itemLabelWidth = itemLabel.node().getComputedTextLength(),
  		        x0 = labelsWidth,
  		        y0 = (+yOrder(d.data) + 1) * (barHeight+1) - m[1],
              initialDistance = 10000,
  		        barLength = xScale(d.data.v),
  		        transitionDirection = d3.select(this).attr('transitionDirection'),
              transitionType = d3.select(this).attr('transitionType');          
          //keep track of the previous bar lengths for transitions. we attach the value to the path so that it persists.
          this.oldBarLength = +this.oldBarLength || 0;
          this.oldStartAngle = +this.oldStartAngle || 0;
          this.oldEndAngle = +this.oldEndAngle || 0;
          this.oldBarY = +this.oldBarY || y0 - (h / 2 - labelsHeight) * initialDistance;

          var func;          
          if(transitionType==='resize'){
             if(transitionDirection==='bars'){
               func = resizeBars;
             } else {
               func = resizeDonut;
             }
          } else {
            func = morph;
          }          
          return func;          

          function resizeBars (t) {     
            if(t===1){
              this.oldBarLength = +barLength;
              this.oldBarY = y0 - (h / 2 - labelsHeight) * initialDistance;
            }                 
            var r = (h / 2 - labelsHeight) * initialDistance, 
                yy = (y0 -r) * t + this.oldBarY * (1-t), 
                xx = x0,         
                f = {
                  innerRadius: r - barHeight, 
                  outerRadius: r,
                  startAngle: Math.PI - ((barLength * t + this.oldBarLength * (1-t)) / r),
                  endAngle: Math.PI
                },
                fl = {
                  innerRadius: r + barHeight, 
                  outerRadius: r + barHeight *  2,
                  startAngle: Math.PI - barLength / r, 
                  endAngle: Math.PI
                },
                vlx = arc.centroid(f)[0] * 2 - 3, 
                vly = arc.centroid(f)[1],
                vix = adjustLabelTextAnchor(f, 1),
                viy = arc.centroid(f)[1];
                
            translate (f, xx, yy, vlx, vly, vix, viy);
            
          }

          function resizeDonut (t) {
            if(t===1){
              this.oldStartAngle = +d.startAngle;
              this.oldEndAngle = +d.endAngle;
            } 
            var r = h / 2 - labelsHeight, 
                yy = h / 2 -r, 
                xx = w / 2,          
                f = {
                  innerRadius: r - barHeight * 2, 
                  outerRadius: r,
                  startAngle: t * d.startAngle + (1-t) * this.oldStartAngle, 
                  endAngle: t * d.endAngle + (1-t) * this.oldEndAngle
                },
                fl = {
                  innerRadius: r, 
                  outerRadius: r + barHeight *  2,
                  startAngle: t * d.startAngle + (1-t) * this.oldStartAngle, 
                  endAngle: t * d.endAngle + (1-t) * this.oldEndAngle
                },
                vlx = arc.centroid(f)[0] + valueLabelWidth/2,  
                vly = arc.centroid(f)[1], 
                vix = adjustLabelTextAnchor(f, 0) + arc.centroid(fl)[0], 
                viy = arc.centroid(fl)[1];
                
            translate (f, xx, yy, vlx, vly, vix, viy);
          }

  		    function morph(t) {
  		      //t will go from 0 to 1 during the transition
  		      //for t=0 we have bars, and for t=1 we have a donut chart
  		      //the transitionDirection attribute of the paths indicate if we should go from bars to donut or vice versa - we use it to reverse t if needed
  		      if(transitionDirection=='bars'){
  		        t = 1 - t;
  		      }            

  		      //(original idea of interpolating on initially huge D3.js arcs is from Mike Bostock here: http://bl.ocks.org/mbostock/1256572)
  		      //the idea is to start with huge arcs (hundreds of thousands pixels radius), take a very small slice of them (start and end anles very close) and translate them back to the origin
  		      //this make it look like rectangles initially. initial all arcs have similar angles to keep the pseudo-rectangles aligned.
  		      //from there the arcs become smaller, the translation becomes smaller to keep them within the svg, and the angles get bigger so the arcs stay the same size and become curvier
  		      //all these parameters converge towards d, which is the {innerRadius, outerRadius, startAngle, endAngle} object coming from pie(data), and the arcs finally form a donut chart
  		      var r = (h / 2 - labelsHeight) / Math.min(1, t + 1/initialDistance), //r is the radius of the arcs. starts huge and converges towards h/2 and some padding. note: the bigger bars you want, the bigger the initial arcs have to be to avoid anti-aliasing effects
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
  		          vix = adjustLabelTextAnchor(f, a) + (1-a) * arc.centroid(fl)[0], //for the item labels we start at the left of the initial arcs, then converge towards the centroid of fl, which are similar arcs with bigger radius
  		          viy = a * arc.centroid(f)[1] + (1-a) * arc.centroid(fl)[1];
  		          
  		      translate (f, xx, yy, vlx, vly, vix, viy);
  		    }

          function adjustLabelTextAnchor(f, a){
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

          function translate (f, xx, yy, vlx, vly, vix, viy) {
            //transform arc
            path.attr('transform', 'translate(' + xx + ',' + yy + ')');
            path.attr('d', arc(f));
            //move labels
            valueLabel.attr('transform', 'translate(' + vlx + ',' + vly + ')translate(' + xx + ',' + yy + ')');
            itemLabel.attr('transform', 'translate(' + vix + ',' + viy + ')translate(' + xx + ',' + yy + ')');
          }
  		  }
      
        //functions triggering the transformations (using the scope to be triggered from the directive's template)
    		scope.donut = function() {
    		  svg.selectAll('path')      
    		      .attr('transitionDirection', 'donut')
              .attr('transitionType', 'morph')
    		    .transition()
    		      .duration(duration)
    		      .style('fill', function(d, i) { return color(i); })
    		      .tween('arc', transfoTween);

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
    		      .attr('transitionDirection', 'bars')
              .attr('transitionType', 'morph')
    		    .transition()
    		      .duration(duration)
                  .style('fill', 'steelblue')
    		      .tween('arc', transfoTween);

    		    svg.selectAll('.itemLabel')
    		      .attr('visibility','visible');
    		};

        //function triggering filter changes
        function toggleFilter (index) {
            var selectedCount = scope.filter.length;
            //toggle filter value
            var foundAt =  scope.filter.indexOf(scope.chartData[index].n);
            if(foundAt>=0){
              scope.filter.splice(foundAt,1);
            } else {
              scope.filter.push(scope.chartData[index].n);
            }
            //if it was the only selected before, re-select all
            if(selectedCount === 1 && foundAt >=0){
                scope.filter = [];
            }
            scope.filterchanged(scope.field);            
            buildChart ();
        }
        
        //function setting all paths transition mode (resize or morph)
        function setAllTransitions (argument) {
          svg.selectAll('path')
                .attr('transitionType', argument);
        }
      }
    };
  });
