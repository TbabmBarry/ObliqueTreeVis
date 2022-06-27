<template>
    <div class="h-full">
        <div class="w-full h-full overflow-auto" id="projection"></div>
    </div>
</template>
<script setup>
import _ from 'lodash';
import { onMounted, inject, ref, watch } from "vue";
import { getProjection } from "@/api/metrics.js";

let d3 = inject("d3");

const projections = ref([]);
const rootElement = ref({});
const selectedPoints = ref([]);

onMounted(async() => {
    projections.value = await getProjection()
        .then(function (res) {
            // console.log(projections);
            return res.data;
        }).catch((error) => {
            console.log("ERROR: ", error);
        });
    rootElement.value = document.querySelector("#projection");
    initProjectionView(projections.value);
})

function initProjectionView (projectionData) {
    const { width, height } = _.pick(rootElement.value.getBoundingClientRect(), ['width', 'height']);
    const padding = 20;
    const colorScale = d3.scaleOrdinal(["#e63946", "#a8dadc", "#457b9d", "#1d3557"]);
    // Create the base svg binding it to rootElement
    const baseSvg = d3.select(rootElement.value)
            .append('svg')
            .attr('id', 'projection-svg')
            .attr('class', 'projection-view')
            .attr('width', width)
            .attr('height', height);
    

    baseSvg.append("style")
      .text(`circle.unselected { fill-opacity: 1; r: 2px; }`);

    
    // Create the circle svg group and append it to the base svg
    const circleGroup = baseSvg
            .append('g')
            .attr('class', 'projection-view-group');

    // Create x and y value encodings for the circle group
    const x = d3.scaleLinear()
            .domain(d3.extent(projectionData, (d) => d.position[0]))
            .range([padding / 2, width - padding / 2]),
        y = d3.scaleLinear()
            .domain(d3.extent(projectionData, (d) => d.position[1]))
            .range([height - padding / 2, padding / 2]);
    
    circleGroup.append("rect")
        .attr("fill", "none")
        .attr("stroke", "#aaa")
        .attr("x", padding / 2 + 0.5)
        .attr("y", padding / 2 + 0.5)
        .attr("width", width - padding)
        .attr("height", height - padding);

    circleGroup.selectAll("circle")
        .data(projectionData)
        .join("circle")
            .attr("cx", (d) => {
                return x(d.position[0]);
            })
            .attr("cy", (d) => {
                return y(d.position[1]);
            });
            
    const circle = circleGroup.selectAll("circle")
        .attr("r", 3.5)
        .attr("fill-opacity", 0.7)
        .attr("fill", d => colorScale(d.label));

    circleGroup.call(brush, circle, baseSvg, x, y, projectionData);
    baseSvg.property("value", []);
}

function brush (cell, circle, svg, x, y, projectionData) {
    const { width, height } = _.pick(rootElement.value.getBoundingClientRect(), ['width', 'height']);
    const padding = 20;
    const brush = d3.brush()
        .extent([[padding / 2, padding / 2], [width - padding / 2, height - padding / 2]])
        .on("start", brushStarted)
        .on("brush", brushed)
        .on("end", brushEnded);
    
    cell.call(brush);
    let brushCell;

    function brushStarted () {
        if (brushCell !== this) {
            d3.select(brushCell).call(brush.move, null);
            brushCell = this;
        }
    }

    function brushed ({selection}) {
        let selected = [];
        if (selection) {
            const [[x0, y0], [x1, y1]] = selection; // selection is a list of two lists of two numbers
            // Label unselected points as "unselected" and update their style
            circle.classed("unselected", d => 
                x0 > x(d.position[0]) 
                || x1 < x(d.position[0]) 
                || y0 > y(d.position[1]) 
                || y1 < y(d.position[1]));
            // Get the selected points
            selected = projectionData.filter(
                d => x0 <= x(d.position[0]) 
                && x1 >= x(d.position[0]) 
                && y0 <= y(d.position[1]) 
                && y1 >= y(d.position[1]));
        }
        // Update the selected points
        selectedPoints.value = selected;

    }

    function brushEnded ({ selection }) {
        if (selection) return;
        // Reset the selected points
        selectedPoints.value = [];
        // Reset the unselected points to their original style
        circle.classed("unselected", false);
    }
}

watch(() => selectedPoints.value,
    val => {
        console.log("selectedPoints changed: ", val);
    });
</script>
<style scoped>
</style>