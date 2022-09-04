<template>
    <div class="w-full h-screen">
        <div class="m-2">
            <div class="w-full h-full overflow-auto" id="feature"></div>
            <div class="feature-table"></div>
        </div>
    </div>
</template>
<script setup>
import _ from 'lodash';
import { inject, reactive, toRefs, watch, onMounted } from "vue";
import { getDatasetChangeSelects } from "@/api/metrics.js";

let d3 = inject("d3");

const props = defineProps({
    selectedDataset: {
        type: String,
        default: "iris"
    }
});

const state = reactive({
    rootElement: {},
    trainingData: {},
    featureTable: [],
    min: 0,
    max: 0,
    width: 0,
    height: 0,
    padding: 40,
});

onMounted(async() => {
    state.rootElement = document.querySelector("#feature");
    initGlobalFeatureView("penguins");
});

async function initGlobalFeatureView(dataset_name) {
    // remove all existing elements
    d3.select("#feature").selectAll("*").remove();
    let req = {
        dataset_name: dataset_name
    };
    state.trainingData = await getDatasetChangeSelects(req)
        .then(function (bundle) {
            let { trainingSet, labelSet } = bundle.data;
            trainingSet = dataset_name === "penguins" ? trainingSet.map(([f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8]) => ({ f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8 }))
                    : trainingSet.map(([f_1, f_2, f_3, f_4]) => ({ f_1, f_2, f_3, f_4 }));
            return trainingSet;
        })
        .catch(function (error) {
            console.log(error);
        }); 
    const features = Object.keys(state.trainingData[0]);
    const featureData = {};
    features.forEach(feature => {
        featureData[feature] = [];
    });
    state.trainingData.forEach(obj => {
        features.forEach(feature => featureData[feature].push(obj[feature]));
    })
    features.forEach(feature => {
        state.min < d3.min(featureData[feature]) ? state.min : state.min = d3.min(featureData[feature]);
        state.max > d3.max(featureData[feature]) ? state.max : state.max = d3.max(featureData[feature]);
        state.featureTable.push({
            name: feature,
            boxplot: {
                min: d3.min(featureData[feature]),
                max: d3.max(featureData[feature]),
                q1: d3.quantile(featureData[feature], 0.25),
                median: d3.quantile(featureData[feature], 0.5),
                q3: d3.quantile(featureData[feature], 0.75),
            }
        })
    });
    initFeatureTable();
}

const initFeatureTable = () => {
    let tableSvg = d3.select(".feature-table");
    // Append a table to the div
    let table = tableSvg.append("table")
        .attr("class", "table table-auto border-separate border-spacing-2 border border-slate-400")
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

    // return a selection of cell elements in the header row
    // attribute (join) data to the selection
    // update (enter) the selection with nodes that have data
    // append the cell elements to the header row
    // return the text string for each item in the data array
    theadRow.selectAll("th")
        .data(Object.keys(state.featureTable[0]))
        .enter()
        .append("th")
        .attr("class", "border border-slate-300")
        .text((d) => d);
    
    // Append table body rows
    let tbdoyRow = tbody.selectAll("tr")
        .data(state.featureTable)
        .enter()
        .append("tr")
        .attr("class", "body-row");
    
    // Append table body cells
    tbdoyRow.selectAll("td")
        .data((d) => Object.values(d))
        .enter()
        .append("td")
        .attr("class", "border border-slate-300")
        .text((d) => {
            if (typeof d === "string") return d;
        })
        .filter((d) => typeof d !== "string")
        .append((d) => {
            console.log(d);
            return drawBoxplot(d);
        })
}

const drawBoxplot = (boxplotData) => {
    const { width, height } = _.pick(state.rootElement.getBoundingClientRect(), ["width", "height"]);
    let w = width * 0.8, h = w * 0.2, padding = 10;
    const features = Object.keys(state.trainingData[0]);

    const x = d3.scaleLinear()
        .domain([state.min, state.max])
        .range([padding, w-padding]);

    let boxplot = document.createElement("div");
    let boxplotSvg = d3.select(boxplot).append("svg")
        .attr("width", w)
        .attr("height", h);
    
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
            .attr("x1", function(d){ return(x(d.min))})
            .attr("x2", function(d){ return(x(d.max))})
            .attr("y1", function(d){ return(h/2)})
            .attr("y2", function(d){ return(h/2)})
            .attr("stroke", "black")
            .style("width", 40)
    
    // Draw rectangle for the main box
    cell.selectAll("boxes")
        .data([boxplotData])
        .enter()
        .append("rect")
            .attr("x", function(d){ return(x(d.q1))})
            .attr("y", function(d){ return(padding)})
            .attr("height", function(d){ return(h-2*padding)})
            .attr("width", function(d){ return(x(d.q3)-x(d.q1))})
            .attr("stroke", "black")
            .style("fill", "#69b3a2")
            .style("opacity", 0.5)
    
    // Show the median
    cell.selectAll("medianLines")
        .data([boxplotData])
        .enter()
        .append("line")
            .attr("x1", function(d){ return(x(d.median))})
            .attr("x2", function(d){ return(x(d.median))})
            .attr("y1", function(d){ return(padding)})
            .attr("y2", function(d){ return(h-padding)})
            .attr("stroke", "black")
            .style("width", 80);
    
    return boxplot;
}

watch(() => props.selectedDataset, (newVal, oldVal) => {
    initGlobalFeatureView(newVal);
},
{
    immediate: false
});

watch(() => state.trainingData, (newVal, oldVal) => {
    console.log(state.featureTable);
},
{
    immediate: false
});

</script>
<style scoped>
</style>