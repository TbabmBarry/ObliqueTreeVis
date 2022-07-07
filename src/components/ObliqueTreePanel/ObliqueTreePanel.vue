<template>
    <div class="w-full h-screen">
        <div class="w-full h-screen overflow-auto" id="vis"></div>
    </div>
</template>
<script setup>
import { onMounted, inject, reactive, watch } from "vue";
import Odt from '@/libs/ObliqueDecisionTree/ObliqueDecisionTree';
import BivariateDecisionTree from '@/libs/ObliqueDecisionTreeExporter/ObliqueDecisionTreeExporter';
import { getDataset, getDatasetChangeSelects } from "@/api/metrics.js";

let d3 = inject("d3");

const props = defineProps({
    selectedPoints: {
        type: Array,
        default: () => []
    },
    selectedDataset: {
        type: String,
        default: "penguins"
    }
});

const state = reactive({
    rootNode: {},
    trainingData: {},
    nodeTreePath: {
        iris: ["root", "r", "rr"],
        penguins: ["root", "l", "lr", "lrl"]
    },
    decisionNodes: {
        iris: [
            [ 0, 0, 1, 0, -2.550000],
            [ 0, 0.00638759, 0, -0.17323776, 0.291713],
            [ 0, 0, 1, 0, -5.000000]
        ],
        penguins: [
            [0, -0.699623, 0, 1.000000, 0, 0, 0, 0, -0.464679],
            [-3.413128, 0, 0, 0, 1.000000, 0, 0, 0, 0.388552],
            [-1.185092, 0, 0, 0, 1.000000, 0, 0, 0, 0.296273],
            [0, 1.000000, 0, 0, 0, 0, 0, 0, -0.145013]
        ]
    },
    obliqueTreeVis: null
})

onMounted(async () => {
    initializeObliqueTree("penguins");
})

const initializeObliqueTree = async (dataset_name) => {
    d3.select("#vis").selectAll("*").remove();
    let opts = null;
    let req = {
        dataset_name: dataset_name
    };
    state.rootNode = await getDatasetChangeSelects(req)
        .then(function (bundle) {
            const { trainingSet, labelSet } = bundle.data;
            const builder = {
                trainingSet,
                labelSet,
                nodeTreePath: state.nodeTreePath[dataset_name],
                decisionNodes: state.decisionNodes[dataset_name]
            };
            // Re-classify
            const exporter = new BivariateDecisionTree(builder);
            exporter.run();
            return exporter.output;
        }).catch(function (error) {
            console.log("ERROR: ", error);
        });
        state.trainingData = await getDatasetChangeSelects(req)
            .then(function (bundle) {
                let { trainingSet, labelSet } = bundle.data;
                trainingSet = dataset_name === "penguins" ? trainingSet.map(([f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8]) => ({ f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8 }))
                    : trainingSet.map(([f_1, f_2, f_3, f_4]) => ({ f_1, f_2, f_3, f_4 }));
                return { trainingSet, labelSet };
            });
        state.obliqueTreeVis = new Odt(["#vis"]);
        state.obliqueTreeVis.init();
        state.obliqueTreeVis.setDataAndOpts(opts, state.rootNode, state.trainingData);
        state.obliqueTreeVis.draw();
}

watch(() => props.selectedPoints, (newValue, oldValue) => {
    // Get related links nad nodes from selected points
    const { exposedFlowLinks, uniqueDecisionPaths } = state.obliqueTreeVis.renderSelectionEffect(newValue);
    const colorScale = ["#e63946", "#a8dadc", "#457b9d"];
    // Update all the links and nodes' opacity to 0.4 in the vis 
    d3.selectAll("g.node--internal")
        .style("opacity", 0.4);
    d3.selectAll("g.node--leaf")
        .style("opacity", 0.4);
    d3.selectAll("path.link")
        .style("opacity", 0.4);
    
    d3.selectAll("circle.detailed.dot")
        .style("fill", "white");
    props.selectedPoints.forEach((selectedDataPoint) => {
        d3.selectAll(`circle#dot-${selectedDataPoint.id}`)
            .style("fill", colorScale[selectedDataPoint.label]);
    });
    
    // Update related links and nodes' opacity to 1 in the vis
    exposedFlowLinks.forEach((exposedFlowLink) => {
        d3.selectAll(`path.link#${exposedFlowLink}`)
            .style("opacity", 1);
    });
    uniqueDecisionPaths?.forEach((uniqueDecisionPath) => {
        uniqueDecisionPath?.path.forEach((decisionNode) => {
            // Select all related svg groups and apply opacity 1
            d3.select(d3.selectAll(`rect.node-rect#${decisionNode}`).node().parentNode)
                .style("opacity", 1);
        });
    });

    // Select all related svg groups and apply opacity 1 when selection process is over
    if (oldValue.length !== 0 && newValue.length === 0) {
        state.obliqueTreeVis.update();
    }
});

watch(() => props.selectedDataset, (val) => {
    initializeObliqueTree(val);
});
</script>
<style scoped>
</style>