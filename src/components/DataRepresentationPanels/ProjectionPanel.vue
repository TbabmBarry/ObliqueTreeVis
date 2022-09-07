<template>
    <div class="m-2">
        <div class="w-full h-full" id="projection"></div>
    </div>
</template>
<script setup>
import _ from 'lodash';
import { onMounted, inject, reactive, watch } from "vue";
import { getProjectionChangeSelects } from "@/api/metrics.js";

let d3 = inject("d3");

const emit = defineEmits(["emitSelectedPointsChanged"]);

const props = defineProps({
    selectedDataset: {
        type: String,
        default: "iris"
    }
});

const state = reactive({
    projections: [],
    rootElement: {},
    selectedPoints: [],
    selectedPointsInDetailedView: [],
    width: 0,
    height: 0,
    padding: 20,
    colorScale: ["#66c2a5", "#fc8d62", "#8da0cb"]
})

onMounted(async() => {
    state.rootElement = document.querySelector("#projection");
    initProjectionView("penguins");
    const observer = new MutationObserver(() => {
        const odt = document.querySelector("#vis").querySelector("#odt-0");
        odt.addEventListener("emitSelectedPointsInDetailedView", (e) => {
            state.selectedPointsInDetailedView = odt["selectedPointsInDetailedView"];
        });
    });
    observer.observe(document.querySelector("#vis"), {
        attributes: true,
        childList: true,
        subtree: true
    });
})

/**
 * Draw the projection view
 *
 * @returns {any}
 */
async function initProjectionView (dataset_name) {
    // remove all existing elements
    d3.select("#projection").selectAll("*").remove();
    let req = {
        dataset_name: dataset_name
    };
    state.projections = await getProjectionChangeSelects(req)
        .then(function (res) {
            return res.data;
        }).catch((error) => {
            console.log("ERROR: ", error);
        });
    const { width, height } = _.pick(state.rootElement.getBoundingClientRect(), ['width', 'height']);
    state.width = width;
    state.height = height;
    // Create the base svg binding it to rootElement
    const baseSvg = d3.select(state.rootElement)
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
            .domain(d3.extent(state.projections, (d) => d.position[0]))
            .range([state.padding, state.width-state.padding]),
        y = d3.scaleLinear()
            .domain(d3.extent(state.projections, (d) => d.position[1]))
            .range([state.height-state.padding, state.padding]);
    
    circleGroup.append("rect")
        .attr("fill", "none")
        .attr("stroke", "none")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", state.width)
        .attr("height", state.height);

    circleGroup.selectAll("circle")
        .data(state.projections)
        .join("circle")
            .attr("class", "circle")
            .attr("id", (d) => `dot-${d.id}`)
            .attr("cx", (d) => {
                return x(d.position[0]);
            })
            .attr("cy", (d) => {
                return y(d.position[1]);
            });
            
    const circle = circleGroup.selectAll("circle")
        .attr("r", 3.5)
        .attr("fill-opacity", 0.7)
        .attr("fill", d => state.colorScale[d.label]);

    circleGroup.call(brush, circle, x, y);
    baseSvg.property("value", []);
}

/**
 * Brush function
 * @param {any} cell
 * @param {any} circle
 * @param {any} x
 * @param {any} y
 * @returns {any}
 */
function brush (cell, circle, x, y) {
    const brush = d3.brush()
        .extent([[0,0], [state.width, state.height]])
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
            selected = state.projections.filter(
                d => x0 <= x(d.position[0]) 
                && x1 >= x(d.position[0]) 
                && y0 <= y(d.position[1]) 
                && y1 >= y(d.position[1]));
        }
        // Update the selected points
        state.selectedPoints = selected;

    }

    function brushEnded ({ selection }) {
        if (selection) return;
        // Reset the selected points
        state.selectedPoints = [];
        // Reset the unselected points to their original style
        circle.classed("unselected", false);
    }
}

const updateSelectedPointsInDetailedView = (selectedPoints) => {
    d3.select(state.rootElement).selectAll(".circle").classed("unselected", true);
    selectedPoints.forEach(d => {
        d3.select(state.rootElement).select(`circle#dot-${d}`).classed("unselected", false);
    });
}

watch(() => state.selectedPoints,
    val => {
        emit("emitSelectedPointsChanged", state.selectedPoints);
    },
    { immediate: false }
);

watch(() => props.selectedDataset,
    val => {
        initProjectionView(val);
    },
    { immediate: false }
);

watch(() => state.selectedPointsInDetailedView,
    val => {
        if (val.length === 0) {
            d3.select(state.rootElement).selectAll(".circle").classed("unselected", false);
        } else {
            updateSelectedPointsInDetailedView(val);
            state.selectedPoints = val;
        }
    },
    { immediate: false }
);


</script>
<style scoped>
</style>