<template>
    <div class="h-full m-2">
        <div class="titles">
            Model Info: 
        </div>
        <div class="leading-normal gap my-2">
            <span class="col-span-1 titles align-bottom">Type: </span>
            <span class="col-span-2 info align-bottom">Bivariate Decision Tree</span>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-3 gap my-2">
            <div class="col-span-1 titles">
                Datasets: 
            </div>
            <div class="col-span-2">
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
        <div class="grid grid-cols-3 h-1/2 gap my-2" id="class-overview">
        </div>
    </div>
</template>
<script setup>
import _ from 'lodash';
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
    padding: 20,
    labelSet: [],
    classCounts: {},
    colorScale: ["#e63946", "#a8dadc", "#457b9d"]
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
    renderClassDistribution();
}

function renderClassDistribution () {
    d3.select("#class-overview").selectAll("*").remove();
    const { width, height } = _.pick(state.rootElement.getBoundingClientRect(), ['width', 'height']);
    state.width = width;
    state.height = height;
    console.log(state.width, state.height);
    // Create the base svg binding it to rootElement
    const baseSvg = d3.select(state.rootElement)
            .append('svg')
            .attr('id', 'class-overview-svg')
            .attr('class', 'class-overview')
            .attr('width', width)
            .attr('height', height);
    
    const classDistribution = baseSvg.append("g")
        .attr("class", "class-distribution-overview");

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(state.classCounts, d => d.count)])
        .range([state.padding, width - state.padding]),
        yScale = d3.scaleBand()
            .domain(state.classCounts.map(d => d.label))
            .range([state.padding, height - state.padding]);

    classDistribution.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height - state.padding})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    classDistribution.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${state.padding}, 0)`)
        .call(d3.axisLeft(yScale));

    classDistribution.selectAll(".class-bar")
        .data(state.classCounts)
        .enter()
        .append("rect")
        .attr("class", "class-bar")
        .attr("x", d => xScale(0))
        .attr("y", d => yScale(d.label))
        .attr("width", d => xScale(d.count))
        .attr("height", yScale.bandwidth())
        .attr("fill", d => state.colorScale[d.label]);
}

watch(() => props.selectedPoints, (newValue, oldValue) => {
    console.log("selectedPoints changed", newValue);

}, { immediate: false });

let { value1, options1 } = toRefs(state);
</script>
<style scoped>
</style>