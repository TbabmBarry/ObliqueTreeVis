<template>
    <div class="flex flex-col">
        <div class="w-full px-2 flex justify-center text-xl text-white font-bold rounded header border-double border-2 border-slate-100 bg-slate-400">Control Panel</div>
        <div class="m-2 h-full flex flex-col">
            <div class="leading-normal grid grid-cols-2 gap mb-2">
            <div class="col-span-1 titles text-base">
                Type: 
            </div>
            <div class="col-span-1 text-center text-base">
                <a-select
                    ref="select"
                    v-model:value="value2"
                    style="width: 100%"
                    size="small"
                    :options="options2"
                    @change="handleModelChange"
                ></a-select>
            </div>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-2 gap my-2">
            <div class="col-span-1 titles text-base">
                Datasets: 
            </div>
            <div class="col-span-1 text-center">
                <a-select
                    ref="select"
                    v-model:value="value1"
                    style="width: 100%"
                    size="small"
                    :options="options1"
                    @change="handleDatasetChange"
                ></a-select>
            </div>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-2 gap my-2">
            <div class="col-span-1 titles text-base">
                Data Amount:
            </div>
            <div class="col-span-1 text-center text-base" id="data-amount">
                {{ dataAmount }}
            </div>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-2 gap my-2">
            <div class="col-span-1 titles text-base">
                Selected Instances:
            </div>
            <div class="col-span-1 w-1/2 m-auto rounded shadow text-center text-base">
                {{ props.selectedPoints.length }}
            </div>
        </div>
        <hr style="height:1px" />
        <div class="gap grow content-center" id="class-overview">
        </div>
        </div>
            <!-- <a 
                target="_blank" 
                rel="noopener noreferrer" 
                href="https://github.com/TbabmBarry/oblique-tree/tree/main" 
                class="text-2xl text-black underline decoration-4 decoration-sky-500 hover:underline hover:text-sky-800">
                ObliqueTreeVis
            </a> -->
            
        
    </div>
</template>
<script setup>
import _ from 'lodash';
import { reactive, ref, toRefs, inject, watch, onMounted } from "vue";
import { getDatasetChangeSelects } from "@/api/metrics.js";

let d3 = inject("d3");

const emit = defineEmits(["emitSelectedDatasetChanged", "emitSelectedModelChanged"]);

const props = defineProps({
    selectedPoints: {
        type: Array,
        default: () => []
    }
});

const state = reactive({
    value1: ref('penguins'),
    options1: ref([
        // {
        // value: 'iris',
        // label: 'Iris Data',
        // }, 
        {
            value: 'penguins',
            label: 'Penguins Data',
        },
        {
            value: 'blobs',
            label: 'Generated Data',
        }
        // {
        //     value: 'wine',
        //     label: 'Wine Data',
        // }
    ]),
    value2: ref('bivariate'),
    options2: ref([
        {
            value: 'bivariate',
            label: 'Bivariate Decision Tree',
        },
        {
            value: 'univariate',
            label: 'Decision Tree',
        }
    ]),
    rootElement: {},
    width: 0,
    height: 0,
    padding: 0,
    labelSet: [],
    dataAmount: 0,
    xScale: {},
    yScale: {},
    classCounts: {},
    classNames: {
        "penguins": ['Adelie','Gentoo','Chinstrap'],
        "iris": ['setosa', 'versicolor', 'virginica'],
        "wine": ['class_0', 'class_1', 'class_2'],
        "blobs": ['class_0', 'class_1', 'class_2']
    },
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

const handleDatasetChange = (value) => {
    initiateClassOverview();
    emit("emitSelectedDatasetChanged", value);
};

const handleModelChange = (value) => {
    emit("emitSelectedModelChanged", value);
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
            labelSet.shift();
            return labelSet.slice();
        }).catch(function (error) {
            console.log("ERROR: ", error);
        });
    state.classCounts = occurrence(state.labelSet);
    state.dataAmount = state.labelSet.length;
    renderClassDistribution();
}

// const mouseover = function(d) {
//     state.tooltip.style("opacity", 1);
//     d3.select(this)
//         .style("stroke", "black")
//         .style("stroke-width", 2)
//         .style("opacity", 1);
// }

// const mousemove = function(event, d) {
//     state.tooltip.html("Count: " + d.count)
//         .style("left", (d3.pointer(event)[0]/2) + "px")
//         .style("top", (d3.pointer(event)[1]/16) + "px");
// }

// const mouseout = function(d) {
//     state.tooltip.style("opacity", 0);
//     d3.select(this)
//         .style("stroke", "none")
//         .style("opacity", 0.8);
// }

// state.tooltip = d3.select(state.rootElement)
//     .append("div")
//     .attr("class", "tooltip-class-overview")
//     .style("opacity", 0)
//     .style("width", "80px")
//     .style("height", "30px")
//     .style("background-color", "white")
//     .style("border", "solid")
//     .style("border-width", "2px")
//     .style("border-radius", "5px")
//     .style("padding", "2px");

function renderClassDistribution () {
    d3.select("#class-overview").selectAll("*").remove();
    const { width, height } = _.pick(state.rootElement.getBoundingClientRect(), ['width', 'height']);
    state.padding = 0.05 * width;
    state.width = width;
    state.height = height;
    // Create the base svg binding it to rootElement
    state.baseSvg = d3.select(state.rootElement)
        .append('svg')
        .attr('id', 'class-overview-svg')
        .attr('class', 'class-overview')
        .attr('width', width)
        .attr('height', height);

    const classDistribution = state.baseSvg.append("g")
        .attr("class", "class-distribution-overview");

    state.yScale = d3.scaleBand()
        .domain(state.classCounts.map(d => d.label))
        .range([state.padding, height - state.padding])
        .padding(0.2);
    
    state.xScale = d3.scaleLinear()
        .domain([0, d3.max(state.classCounts, d => d.count)])
        .range([state.padding, width*0.7]);

    const selectedClassDistribution = state.baseSvg.append("g")
        .attr("class", "selected-class-overview");

    // Create an empty y axis on the right
    selectedClassDistribution.append("g")
        .attr("class", "x-axis-bottom")
        .attr("transform", `translate(${width*0.2-state.padding}, ${state.height-state.padding})`)
        .call(d3.axisBottom(d3.scaleLinear()
            .range([state.padding, width*0.7])).tickValues([]).tickSize(2));

    // Append the y axis title on the top left
    classDistribution.append("text")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", state.padding)
        .style("font-size", (state.padding+width*0.1)*0.25)
        .text("All");
    
    // Append the y axis title on the top right
    selectedClassDistribution.append("text")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height-state.padding/2)
        .style("font-size", (state.padding+width*0.1)*0.25)
        .text("Subsets");

    classDistribution.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(${width*0.2-state.padding}, ${state.padding})`)
        .call(d3.axisTop(state.xScale).tickSize(2))
        .selectAll("text")
        .style("font-size", width*0.03)
        .style("text-anchor", "end");

    classDistribution.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${width*0.2}, 0)`)
        .style("font-size", width*0.04)
        .call(d3.axisLeft(state.yScale).tickFormat((d) => state.classNames[state.value1][d]));

    classDistribution.selectAll(".class-bar")
        .data(state.classCounts)
        .enter()
        .append("rect")
        .attr("class", "class-bar")
        .attr("x", d => state.xScale(0)+width*0.2-state.padding)
        .attr("y", d => state.yScale(d.label))
        .attr("width", d => state.xScale(d.count)-state.padding)
        .attr("height", state.yScale.bandwidth()/2)
        .attr("fill", d => state.colorScale[d.label]);
}

function renderSelectedClassDistribution () {
    d3.selectAll("g.selected-class-overview").remove();
    const selectedClassDistribution = state.baseSvg.append("g")
        .attr("class", "selected-class-overview");

    const xScaleRight = d3.scaleLinear()
        .domain([0, d3.max(state.selectedClassCounts, d => d.count)])
        .range([state.padding, state.width*0.7]);
    
    // Create the y axis on the right
    selectedClassDistribution.append("g")
    .attr("class", "x-axis-bottom")
        .attr("transform", `translate(${state.width*0.2-state.padding}, ${state.height-state.padding})`)
        .style("font-size", state.width*0.03)
        .call(d3.axisBottom(xScaleRight).ticks(5).tickSize(2));

    // Append the y axis title on the top right
    selectedClassDistribution.append("text")
        .attr("text-anchor", "end")
        .attr("x", state.width)
        .attr("y", state.height-state.padding/2)
        .style("font-size", (state.padding+state.width*0.1)*0.25)
        .text("Subsets");

    selectedClassDistribution.selectAll(".selected-class-bar")
        .data(state.selectedClassCounts)
        .enter()
        .append("rect")
        .attr("class", "selected-class-bar")
        .attr("y", d => state.yScale(d.label)+state.yScale.bandwidth()/2)
        .attr("x", d => xScaleRight(0)+state.width*0.2-state.padding)
        .attr("height", state.yScale.bandwidth()/2)
        .attr("width", d => xScaleRight(d.count)-state.padding)
        .attr("fill", d => state.colorScale[d.label])
        // .on("mouseover", mouseover)
        // .on("mousemove", mousemove)
        // .on("mouseout", mouseout);
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
    if (newValue.length > 0) {
        d3.selectAll("rect.class-bar")
            .style("opacity", 0.6);
    }

    if (newValue.length === 0) {
        d3.selectAll("rect.class-bar")
            .style("opacity", 1);
    }


}, { immediate: false });

let { value1, options1, value2, options2, dataAmount, width } = toRefs(state);
</script>
<style scoped>
</style>