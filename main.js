/* Ben Johnson D3 Lab */

//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Total Sq Miles", "Total Stream Miles", "Total Lake Acres", "Total Wetland Acres", "Trout Waters Miles", "Impaired Streams Miles", "Impaired Lakes Acres"];//list of attributes
var expressed = attrArray[0]; //initial attribute
    
//chart frame dimensions
var chartWidth = window.innerWidth * 0.450,
    chartHeight = 473,
    leftPadding = 50,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([chartHeight - 10, 0])
    .domain([0, 88*1.1]); // csv first column max = 88
    
//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    
    //map frame dimensions
    var width = window.innerWidth * 0.425,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    //create Albers equal area conic projection centered on SE Wisconsin
    var projection = d3.geoAlbers()
            .center([2.3, 42.85])
            .rotate([90.5, 0])
            .parallels([41, 43])
            .scale(30000)
            .translate([width / 2, height / 2]);
    
    var path = d3.geoPath()
        .projection(projection);
        
    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
        promises.push(d3.csv("data/Watersheds.csv")); //load attributes from csv
        promises.push(d3.json("data/countyClip.topojson")); //load background spatial data
        promises.push(d3.json("data/Watersheds.topojson")); //load choropleth spatial data
        Promise.all(promises).then(callback);
    
        function callback(data){
            
            [csvData, wCTY, wSheds] = data;
            //csvData = data[0];
            //wCTY = data[1];
            //wSheds = data[2];
            
        //place graticule on the map
        setGraticule(map, path);
                    
            //translate WMU TopoJSON
        var wCounties = topojson.feature(wCTY, wCTY.objects.countyClip),
			seWatersheds = topojson.feature(wSheds, wSheds.objects.Watersheds).features;
            
                //add WMU to map
		var counties = map.append("path")
			.datum(wCounties)
			.attr("class", "counties")
			.attr("d", path);
            
        //join csv data to GeoJSON enumeration units
        seWatersheds = joinData(seWatersheds, csvData);
            
         //create the color scale
        var colorScale = makeColorScale(csvData);
            
        //variables for data join
        //var attrArray = ["watershedSizeSqMiles", "totalStreamMiles", "totalLakeAcres", "totalWetlandAcres", "troutWatersMiles", "impairedStreamsMiles", "impairedLakesAcres"];
        //add enumeration units to the map
        setEnumerationUnits(seWatersheds, map, path, colorScale);
            
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
            
        // dropdown
        createDropdown(csvData);    
   
    };
}; //end of setMap()
 
    function setGraticule(map, path){    
        //create graticule generator
		var graticule = d3.geoGraticule()
			.step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

		//create graticule background
		var gratBackground = map.append("path")
			.datum(graticule.outline()) //bind graticule background
			.attr("class", "gratBackground") //assign class for styling
			.attr("d", path) //project graticule

		//create graticule lines	
		//var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
			//.data(graticule.lines()) //bind graticule lines to each element to be created
		  	//.enter() //create an element for each datum
			//.append("path") //append each element to the svg as a path element
			//.attr("class", "gratLines") //assign class for styling
			//.attr("d", path); //project graticule lines
};
    
 function joinData(seWatersheds, csvData){
    //...DATA JOIN LOOPS FROM EXAMPLE 1.1
       //loop through csv to assign each set of csv attribute values to geojson watershed
        for (var i=0; i<csvData.length; i++){
            var csvWatershed = csvData[i]; //the current watershed
            var csvKey = csvWatershed.WSHED_CODE; //the CSV primary key

            //loop through geojson watersheds to find correct watersheds
            for (var a=0; a<seWatersheds.length; a++){

                var geojsonProps = seWatersheds[a].properties; //the current watershed geojson properties
                var geojsonKey = geojsonProps.WSHED_CODE; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvWatershed[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        console.log(seWatersheds);
     
    return seWatersheds;
};
    
//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        '#ffffd9',
        '#edf8b1',
        '#c7e9b4',
        '#7fcdbb',
        '#41b6c4',
        '#1d91c0',
        '#225ea8',
        '#253494',
        '#081d58'
        
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
};
    
//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};
    
function setEnumerationUnits(seWatersheds, map, path, colorScale){
    //add watersheds to map
		var watersheds = map.selectAll(".watersheds")
			.data(seWatersheds)
			.enter()
			.append("path")
			.attr("class", function(d){
				return "watersheds " + d.properties.WSHED_CODE;
			})
			.attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
            highlight(d.properties);
            })
            .on("mouseout", function(d){
            dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);
    
        //below Example 2.2 line 16...add style descriptor to each path
        var desc = watersheds.append("desc")
        .text('{"stroke": "#ccc", "stroke-width": "1px"}');
    
};
    
//function to create coordinated bar chart
function setChart(csvData, colorScale){
    
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    
    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
       
    //set bars for each watershed
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.WSHED_CODE;
        })
        .attr("width", chartInnerWidth / csvData.length - 30)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
    
    //below Example 2.2 line 31...add style descriptor to each rect
    var desc = bars.append("desc")
    .text('{"stroke": "none", "stroke-width": "0px"}');
    
    //annotate bars with attribute value text
    //var numbers = chart.selectAll(".numbers")
        //.data(csvData)
        //.enter()
       // .append("text")
       // .sort(function(a, b){
            //return a[expressed]-b[expressed]
       // })
       //.attr("class", function(d){
           // return "numbers " + d.WSHED_CODE;
       // })
       // .attr("text-anchor", "middle")
       // .attr("x", function(d, i){
            //var fraction = chartWidth / csvData.length;
           // return i * fraction + (fraction - 1) / 2;
       // })
       // .attr("y", function(d){
            //return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        //})
        //.text(function(d){
           // return d[expressed];
        //});
    
    //below Example 2.8...create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 375)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text(expressed + " in each SubWatershed");
    
    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);
    
};
    
//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};
    
//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    
    // change yscale dynamically
    csvmax = d3.max(csvData, function(d) { return parseFloat(d[expressed]); });
    
    yScale = d3.scaleLinear()
        .range([chartHeight - 10, 0])
        .domain([0, csvmax*1.1]);

    //updata vertical axis 
    d3.select(".axis").remove();
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = d3.select(".chart")
        .append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var watersheds = d3.selectAll(".watersheds")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    
     //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);

    updateChart(bars, csvData.length, colorScale);
    
};
    
//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    
    //add text to chart title
    var chartTitle = d3.select(".chartTitle")
        .text(expressed + " in each SubWatershed");
};
    
//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.WSHED_CODE)
        .style("stroke", "red")
        .style("stroke-width", "4");
    
    setLabel(props);
};

//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.WSHED_CODE)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    
    //below Example 2.4 line 21...remove info label
    d3.select(".infolabel")
        .remove();

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.WSHED_CODE + "_label")
        .html(labelAttribute);

    var watershedName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.WSHED_NAME);
};

//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};
    
})(); //last line of main.js
