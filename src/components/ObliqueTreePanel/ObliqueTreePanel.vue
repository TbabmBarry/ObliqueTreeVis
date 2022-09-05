<template>
    <div class="w-full h-screen">
        <div class="w-full h-screen overflow-auto" id="vis"></div>
    </div>
</template>
<script setup>
import { onMounted, inject, reactive, watch } from "vue";
import Odt from '@/libs/ObliqueDecisionTree/ObliqueDecisionTree';
import BivariateDecisionTree from '@/libs/ObliqueDecisionTreeExporter/ObliqueDecisionTreeExporter';
import { getDatasetChangeSelects } from "@/api/metrics.js";

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
    let opts = {
        dataset_name: props.selectedDataset
    };
    state.obliqueTreeVis = new Odt(["#vis"]);
    state.obliqueTreeVis.init();
    state.obliqueTreeVis.setDataAndOpts(opts, state.rootNode, state.trainingData);
    state.obliqueTreeVis.draw();
}


watch(() => props.selectedPoints, (newValue, oldValue) => {
    // Compute related links nad nodes from selected points
    state.obliqueTreeVis.renderSelectionEffect(newValue);
    // Update current oblique tree view
    state.obliqueTreeVis.update();
    // Select all related svg groups and apply opacity 1 when selection process is over
    if (oldValue.length !== 0 && newValue.length === 0) {
        state.obliqueTreeVis.update("reset");
    }
});

watch(() => props.selectedDataset, (val) => {
    initializeObliqueTree(val);
});
</script>
<style scoped>
</style>