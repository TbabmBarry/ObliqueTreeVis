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

const rootElement = ref({});
// const trainingData = ref({});

onMounted(async() => {
    await getProjection()
        .then(function (res) {
            const projections = res.data;
            console.log(projections);
            initProjectionView(projections);
        }).catch((error) => {
            console.log("ERROR: ", error);
        });
})

function initProjectionView (projectionData) {
    rootElement.value = document.querySelector("#projection");
    const { width, height } = _.pick(rootElement.value.getBoundingClientRect(), ['width', 'height']);
    const colorScale = d3.scaleOrdinal(["#e63946", "#a8dadc", "#457b9d", "#1d3557"]);
    let baseSvg = d3.select(rootElement.value)
            .append('svg')
            .attr('id', 'projection-svg')
            .attr('class', 'projection-view')
            .attr('width', width)
            .attr('height', height);
    
    let svgGroup = baseSvg
            .append('g')
            // .attr("transform",
            //     `translate(${50},${50})`)
            .attr('class', 'projection-view-group');
    let x = d3.scaleLinear()
            .domain(d3.extent(projectionData, (d) => d.position[0]))
            .range([0, width]),
        y = d3.scaleLinear()
            .domain(d3.extent(projectionData, (d) => d.position[1]))
            .range([height, 0]);
    
    svgGroup.selectAll("circle")
                    .data(projectionData)
                    .enter()
                    .append("circle")
                        .attr("class", "detailed dot")
                        .attr("cx", (d) => {
                            return x(d.position[0]);
                        })
                        .attr("cy", (d) => {
                            return y(d.position[1]);
                        })
                        .attr("r", 3.5)
                        .style("fill", d => colorScale(d.label));
}

</script>
<style scoped>
</style>