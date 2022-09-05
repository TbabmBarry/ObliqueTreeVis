<template>
    <div class="w-full h-screen">
        <div class="feature-table"></div>
    </div>
</template>
<script setup>
import _ from 'lodash';
import { inject, reactive, toRefs, watch, onMounted } from "vue";

let d3 = inject("d3");

const props = defineProps({
    featureTable: {
        type: Array,
        default: () => []
    },
});

const state = reactive({
    rootElement: {},
    featureTable: [],
    colorScale: ["#66c2a5", "#fc8d62", "#8da0cb"],
    boxplotMin: Number.POSITIVE_INFINITY,
    boxplotMax: Number.NEGATIVE_INFINITY,
    contributionMin: Number.POSITIVE_INFINITY,
    contributionMax: Number.NEGATIVE_INFINITY,
    width: 0,
    height: 0,
    padding: 40,
});

onMounted(() => {
    state.rootElement = document.querySelector(".feature-table");
});

const initFeatureTable = () => {
    const { width, height } = _.pick(state.rootElement.getBoundingClientRect(), ["width", "height"]);
    state.width = width;
    state.height = height;
    let tableSvg = d3.select(".feature-table");
    // Append a table to the div
    let table = tableSvg.append("table")
        .attr("class", "table table-auto w-full rounded border-separate border-spacing-2 border border-slate-400")
        .classed("display", true);

    // Append a header to the table
    let thead = table.append("thead")
        .attr("class", "table-header");

    // Append a body to the table
    let tbody = table.append("tbody")
        .attr("class", "table-body");

    // append a row to the header
    let theadRow = thead.append("tr")
        .attr("class", "header-row");
    
    state.featureTable.forEach((feature) => {
        // Find the min and max of the feature contribution
        state.contributionMin > d3.min(feature.contribution) ? state.contributionMin = d3.min(feature.contribution) : state.contributionMin;
        state.contributionMax < d3.max(feature.contribution) ? state.contributionMax = d3.max(feature.contribution) : state.contributionMax;
        // Find the min and max of the feature boxplot
        state.boxplotMin > feature.boxplot.min ? state.boxplotMin = feature.boxplot.min : state.boxplotMin;
        state.boxplotMax < feature.boxplot.max ? state.boxplotMax = feature.boxplot.max : state.boxplotMax;
    })
    // return a selection of cell elements in the header row
    // attribute (join) data to the selection
    // update (enter) the selection with nodes that have data
    // append the cell elements to the header row
    // return the text string for each item in the data array
    theadRow.selectAll("th")
        .data(Object.keys(state.featureTable[0]))
        .enter()
        .append("th")
        .attr("class", "border rounded font-bold text-base border-slate-300")
        .text((d) => d);
    
    // Append table body rows
    let tbdoyRow = tbody.selectAll("tr")
        .data(state.featureTable)
        .enter()
        .append("tr")
        .attr("class", "body-row");
    
    // Append table body cells
    tbdoyRow.selectAll("td")
        .data((d) => Object.entries(d))
        .enter()
        .append("td")
        .attr("class", "border rounded text-center border-slate-300");
        

    tbdoyRow.selectAll("td")
        .filter((d) => d[0] === "name")
        .attr("id", "feature-name")
        .attr("width", "20%")
        .text((d) => d[1]);

    tbdoyRow.selectAll("td")
        .filter((d) => d[0] === "contribution")
        .attr("id", "feature-contribution")
        .attr("width", "30%")
        .append((d) => drawBarchart(d[1]));

    tbdoyRow.selectAll("td")
        .filter((d) => d[0] === "boxplot")
        .attr("id", "feature-boxplot")
        .attr("width", "50%")
        .append((d) => drawBoxplot(d[1]));
}

const drawBarchart = (featureContributionData) => {
    // Create SVG element
    let barchart = document.createElement("div");
    barchart.setAttribute("class", "barchart");
    let w = state.width * 0.3, h = w * 0.4, padding = 10;
    const x = d3.scaleLinear()
        .domain([state.contributionMin, state.contributionMax])
        .range([padding, w - padding]);

    const y = d3.scaleBand()
        .domain(featureContributionData.map((d, i) => i))
        .range([padding, h - padding])
        .padding(0.1);
    
    let barchartSvg = d3.select(barchart)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "barchart-svg");

    let cell = barchartSvg.append("g");

    cell.selectAll("bars")
        .data(featureContributionData)
        .enter()
        .append("rect")
        .attr("class", "feature-bar")
        .attr("x", (d) => x(Math.min(0, d)))
        .attr("y", (d, i) => y(i))
        .attr("width", (d) => Math.abs(x(d) - x(0)))
        .attr("height", y.bandwidth())
        .attr("fill", (d, i) => state.colorScale[i]);

    return barchart;
}


const drawBoxplot = (boxplotData) => {
    // Create SVG element
    let boxplot = document.createElement("div");
    boxplot.setAttribute("class", "boxplot");
    let w = state.width * 0.5, h = w * 0.2, padding = 10;

    const x = d3.scaleLinear()
        .domain([state.boxplotMin, state.boxplotMax])
        .range([padding, w - padding]);
    // Color scale
    const myColor = d3.scaleSequential()
        .interpolator(d3.interpolateInferno)
        .domain([state.boxplotMin, state.boxplotMax]);
    
    
    let boxplotSvg = d3.select(boxplot).append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "boxplot-svg");
    let cell = boxplotSvg.append("g");

    // Show the x scale
    cell.append("g")
        .attr("transform", `translate(0, ${h-padding})`)
        .call(d3.axisBottom(x).tickPadding(10));

    // Show the main vertical line
    cell.selectAll("vertLines")
        .data([boxplotData])
        .enter()
        .append("line")
            .attr("x1", (d) => x(d.min))
            .attr("x2", (d) => x(d.max))
            .attr("y1", h/2)
            .attr("y2", h/2)
            .attr("stroke", "black")
            .style("width", 60)
    
    // Draw rectangle for the main box
    cell.selectAll("boxes")
        .data([boxplotData])
        .enter()
        .append("rect")
            .attr("x", (d) => x(d.q1))
            .attr("y", padding)
            .attr("height", h-2*padding)
            .attr("width", (d) => x(d.q3)-x(d.q1))
            .attr("stroke", "black")
            .style("fill", "#69b3a2")
            .style("opacity", 0.5)
    
    // Show the median
    cell.selectAll("medianLines")
        .data([boxplotData])
        .enter()
        .append("line")
            .attr("x1", (d) => x(d.median))
            .attr("x2", (d) => x(d.median))
            .attr("y1", padding)
            .attr("y2", h-padding)
            .attr("stroke", "black")
            .style("width", 120);
    
    // create a tooltip
  let tooltip = d3.select(".feature-table")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("font-size", "16px")
  // Three function that change the tooltip when user hover / move / leave a cell
  const mouseover = function(event, d) {
        tooltip
            .transition()
            .duration(200)
            .style("opacity", 1)
        tooltip
            .html("<span style='color:grey'>Feature Value: </span>" + d)
            .style("left", (d3.pointer(event)[0]+30) + "px")
            .style("top", (d3.pointer(event)[1]+30) + "px")
  }
  const mousemove = function(event, d) {
        tooltip
            .style("left", (d3.pointer(event)[0]+30) + "px")
            .style("top", (d3.pointer(event)[1]+30) + "px")
  }
  const mouseleave = function(d) {
        tooltip
            .transition()
            .duration(200)
            .style("opacity", 0)
  }

  // Add individual points with jitter
  const jitterWidth = 30
  const randomJitterWidth = () => Math.random()*jitterWidth-jitterWidth/2;
  cell.selectAll("indPoints")
    .data(boxplotData.dataset)
    .enter()
    .append("circle")
      .attr("cx", (d) => x(d))
      .attr("cy", (d) => {
        return (h/2)+randomJitterWidth();
      })
      .attr("r", 2)
      .style("fill", (d) => myColor(d))
      .attr("stroke", "black")
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

    return boxplot;
}

watch(() => props.featureTable, (newVal, oldVal) => {
    state.featureTable = newVal.slice();
    initFeatureTable();
},
{
    immediate: false
});

watch(() => state.trainingData, (newVal, oldVal) => {
},
{
    immediate: false
});

</script>
<style scoped>
</style>