<template>
    <div class="h-full">
        <!-- <div class="m-2">
            <div class="col-span-1 titles">
                Projection View
            </div>
        </div>
        <hr style="height:1px" /> -->
        <div class="w-full h-full overflow-auto" id="projection"></div>
    </div>
</template>
<script setup>
import _ from 'lodash';
import { onMounted, inject, ref } from "vue";
import { getProjection } from "@/api/metrics.js";

let d3 = inject("d3");

const projections = ref([]);
const rootElement = ref({});

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
    const colorScale = d3.scaleOrdinal(["#e63946", "#a8dadc", "#457b9d", "#1d3557"]);
    // Create the base svg binding it to rootElement
    const baseSvg = d3.select(rootElement.value)
            .append('svg')
            .attr('id', 'projection-svg')
            .attr('class', 'projection-view')
            .attr('width', width)
            .attr('height', height);
    
    // Create the circle svg group and append it to the base svg
    const circleGroup = baseSvg
            .append('g')
            .attr('class', 'projection-view-group');

    // Create x and y value encodings for the circle group
    const x = d3.scaleLinear()
            .domain(d3.extent(projectionData, (d) => d.position[0]))
            .range([0, width]),
        y = d3.scaleLinear()
            .domain(d3.extent(projectionData, (d) => d.position[1]))
            .range([height, 0]);
    
    circleGroup.selectAll("circle")
        .data(projectionData)
        .enter()
        .append("circle")
            .attr("class", "detailed dot")
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
}

</script>
<style scoped>
</style>