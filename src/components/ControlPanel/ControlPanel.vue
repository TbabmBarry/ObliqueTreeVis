<template>
    <div class="m-2 flex flex-col">
        <div class="titles">
            Model Info: 
        </div>
        <div class="leading-normal grid grid-cols-2 gap my-2">
            <span class="col-span-1 titles align-bottom">Type: </span>
            <span class="col-span-1 info text-sm align-bottom text-center">Bivariate Decision Tree</span>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-2 gap my-2">
            <div class="col-span-1 titles">
                Datasets: 
            </div>
            <div class="col-span-1 text-center">
                <a-select
                    ref="select"
                    v-model:value="value1"
                    style="width:120px"
                    size="small"
                    :options="options1"
                    @focus="focus"
                    @change="handleChange"
                ></a-select>
            </div>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-2 gap my-2">
            <div class="col-span-1 titles">
                Data Amount:
            </div>
            <div class="col-span-1 text-center" id="data-amount">
                {{ dataAmount }}
            </div>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-2 gap my-2">
            <div class="col-span-1 titles">
                Selected Instances:
            </div>
            <div class="col-span-1 rounded shadow text-center">
                {{ props.selectedPoints.length }}
            </div>
        </div>
        <hr style="height:1px" />
        <div class="gap grow justify-center" id="class-overview">
        </div>
    </div>
</template>
<script setup>
import _ from 'lodash';
import textures from 'textures';
import { reactive, ref, toRefs, inject, watch, onMounted } from "vue";
import { getDatasetChangeSelects } from "@/api/metrics.js";

let d3 = inject("d3");

const emit = defineEmits(["emitSelectedDatasetChanged"]);

const props = defineProps({
    selectedPoints: {
        type: Array,
        default: () => []
    }
});

const state = reactive({
    value1: ref('penguins'),
    options1: ref([{
        value: 'iris',
        label: 'Iris Data',
    }, {
        value: 'penguins',
        label: 'Penguins Data',
    }]),
    rootElement: {},
    width: 0,
    height: 0,
    padding: 40,
    labelSet: [],
    dataAmount: 0,
    xScale: {},
    yScale: {},
    classCounts: {},
    selectedClassCounts: {},
    baseSvg: {},
    tooltip: {},
    colorScale: ["#66c2a5", "#fc8d62", "#8da0cb"]
});

onMounted(async () => {
    state.rootElement = document.querySelector("#class-overview");
    initiateClassOverview();
});

const focus = () => {
    // console.log("focus");
};

const handleChange = (value) => {
    initiateClassOverview();
    emit("emitSelectedDatasetChanged", value);
};

const occurrence = (arr) => {
    const counts = {};
    for (const num of arr) {
        counts[num] = counts[num] ? counts[num] + 1 : 1;
    }
    return Object.keys(counts).map((key) => ({
        label: Number(key),
        count: counts[key]
    }));
}

async function initiateClassOverview () {
    let req = {
        dataset_name: state.value1
    };
    state.labelSet = await getDatasetChangeSelects(req)
        .then(function (bundle) {
            let { trainingSet, labelSet } = bundle.data;
            return labelSet.slice();
        }).catch(function (error) {
            console.log("ERROR: ", error);
        });
    state.classCounts = occurrence(state.labelSet);
    state.dataAmount = state.labelSet.length;
    renderClassDistribution();
}

const mouseover = function(d) {
    state.tooltip.style("opacity", 1);
    d3.select(this)
        .style("stroke", "black")
        .style("stroke-width", 2)
        .style("opacity", 1);
}

const mousemove = function(event, d) {
    state.tooltip.html("Count: " + d.count)
        .style("left", (d3.pointer(event)[0]/2) + "px")
        .style("top", (d3.pointer(event)[1]/16) + "px");
}

const mouseout = function(d) {
    state.tooltip.style("opacity", 0);
    d3.select(this)
        .style("stroke", "none")
        .style("opacity", 0.8);
}

function renderClassDistribution () {
    d3.select("#class-overview").selectAll("*").remove();
    const { width, height } = _.pick(state.rootElement.getBoundingClientRect(), ['width', 'height']);
    state.width = width;
    state.height = height;
    // Create the base svg binding it to rootElement
    state.baseSvg = d3.select(state.rootElement)
        .append('svg')
        .attr('id', 'class-overview-svg')
        .attr('class', 'class-overview')
        .attr('width', width)
        .attr('height', height);

    state.tooltip = d3.select(state.rootElement)
        .append("div")
        .attr("class", "tooltip-class-overview")
        .style("opacity", 0)
        .style("width", "80px")
        .style("height", "30px")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "2px");
    
    const classDistribution = state.baseSvg.append("g")
        .attr("class", "class-distribution-overview");

    state.xScale = d3.scaleBand()
        .domain(state.classCounts.map(d => d.label))
        .range([state.padding, width - state.padding])
        .padding(0.2);
    
    state.yScale = d3.scaleLinear()
        .domain([0, d3.max(state.classCounts, d => d.count)])
        .range([height - state.padding, state.padding]);

    classDistribution.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height - state.padding})`)
        .call(d3.axisBottom(state.xScale))
        .selectAll("text")
        .style("text-anchor", "end");

    classDistribution.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${state.padding}, 0)`)
        .call(d3.axisLeft(state.yScale));

    classDistribution.selectAll(".class-bar")
        .data(state.classCounts)
        .enter()
        .append("rect")
        .attr("class", "class-bar")
        .attr("x", d => state.xScale(d.label))
        .attr("y", d => state.yScale(d.count))
        .attr("width", state.xScale.bandwidth())
        .attr("height", d => height - state.padding - state.yScale(d.count))
        .attr("fill", d => state.colorScale[d.label]);
}

function renderSelectedClassDistribution () {
    d3.selectAll("g.selected-class-overview").remove();
    const selectedClassDistribution = state.baseSvg.append("g")
        .attr("class", "selected-class-overview");
    selectedClassDistribution.selectAll(".selected-class-bar")
        .data(state.selectedClassCounts)
        .enter()
        .append("rect")
        .attr("class", "selected-class-bar")
        .attr("x", d => state.xScale(d.label))
        .attr("y", d => state.yScale(d.count))
        .attr("width", state.xScale.bandwidth())
        .attr("height", d => state.height - state.padding - state.yScale(d.count))
        .attr("fill", function (d) {
            const texture = textures.lines()
                .size(8)
                .strokeWidth(2)
                .stroke("#000")
                .background(state.colorScale[d.label]);
            selectedClassDistribution.call(texture);
            return texture.url();
        })
        .style("opacity", 0.8)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseout", mouseout);
}

watch(() => props.selectedPoints, (newValue, oldValue) => {
    let counts = {};
    newValue.forEach(selecedPoint => {
        counts[selecedPoint.label] = counts[selecedPoint.label] ? counts[selecedPoint.label] + 1 : 1;
    });
    state.selectedClassCounts = Object.keys(counts).map((key) => ({
        label: Number(key),
        count: counts[key]
    }));
    renderSelectedClassDistribution();
}, { immediate: false });

let { value1, options1, dataAmount } = toRefs(state);
</script>
<style scoped>
</style>