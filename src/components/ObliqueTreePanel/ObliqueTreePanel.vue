<template>
    <div class="w-full h-screen flex flex-col">
        <div class="w-full px-2 flex text-xl justify-center text-white font-bold rounded header border-double border-2 border-slate-100 bg-slate-400">Feature View</div>
        <div class="w-full h-full" id="vis"></div>
    </div>
</template>
<script setup>
import { onMounted, inject, reactive, watch } from "vue";
import Odt from '@/libs/ObliqueDecisionTree/ObliqueDecisionTree';
import BivariateDecisionTree from '@/libs/ObliqueDecisionTreeExporter/ObliqueDecisionTreeExporter';
import { getDatasetChangeSelects } from "@/api/metrics.js";

let d3 = inject("d3");

const emit = defineEmits(["emitFeatureTable", "emitExposedFeatureContributions"]);

const props = defineProps({
    selectedPoints: {
        type: Array,
        default: () => []
    },
    selectedDataset: {
        type: String,
        default: "penguins"
    },
    selectedModel: {
        type: String,
        default: "bivariate"
    },
    selectedFeatures: {
        type: Object,
        default: () => {}
    },
});

const state = reactive({
    rootNode: {},
    trainingData: {},
    nodeTreePath: {
        iris: ["root", "r", "rr"],
        penguins: {
            bivariate: ["root", "l", "lr", "lrl"],
            univariate: ["root","l","ll","lll","llll","r","rr","lr","llr"]
        }
    },
    decisionNodes: {
        iris: [
            [ 0, 0, 1, 0, -2.550000],
            [ 0, 0.00638759, 0, -0.17323776, 0.291713],
            [ 0, 0, 1, 0, -5.000000]
        ],
        penguins: {
            bivariate: [
                [0, -0.699623, 0, 1.000000, 0, 0, 0, 0, -0.464679],
                [-3.413128, 0, 0, 0, 1.000000, 0, 0, 0, 0.388552],
                [-1.185092, 0, 0, 0, 1.000000, 0, 0, 0, 0.296273],
                [0, 1.000000, 0, 0, 0, 0, 0, 0, -0.145013]
            ],
            univariate: [
                [0,0,1,0,0,0,0,0,-0.395],
                [1,0,0,0,0,0,0,0,0.118],
                [0,0,1,0,0,0,0,0,0.301],
                [0,1,0,0,0,0,0,0,0.262],
                [1,0,0,0,0,0,0,0,0.859],
                [0,1,0,0,0,0,0,0,-0.247],
                [0,1,0,0,0,0,0,0,-1.06],
                [0,0,0,0,0,0,1,0,-0.271],
                [0,0,1,0,0,0,0,0,0.819]
            ]
        }
    },
    obliqueTreeVis: null,
    exposedFeatureContributions: []
})

onMounted(() => {
    initializeObliqueTree();
})

const initializeObliqueTree = async () => {
    let dataset_name = props.selectedDataset;
    let model_name = props.selectedModel;
    d3.select("#vis").selectAll("*").remove();
    let req = {
        dataset_name: dataset_name
    };
    state.rootNode = await getDatasetChangeSelects(req)
        .then(function (bundle) {
            const { trainingSet, labelSet } = bundle.data;
            // Remove the first row of the training set, which is the header
            trainingSet.shift();
            const builder = {
                trainingSet,
                labelSet,
                nodeTreePath: state.nodeTreePath[dataset_name][model_name],
                decisionNodes: state.decisionNodes[dataset_name][model_name],
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
            let featureArr = trainingSet.shift();
            trainingSet = trainingSet.map((row) => {
                let obj = {};
                featureArr.forEach((feature, index) => {
                    obj[feature] = parseFloat(row[index]);
                });
                return obj;
            });
            return { trainingSet, labelSet, featureArr };
        });
    let opts = {
        dataset_name: dataset_name
    };
    state.obliqueTreeVis = new Odt(["#vis"]);
    state.obliqueTreeVis.init();
    state.obliqueTreeVis.setDataAndOpts(opts, state.rootNode, state.trainingData);
    state.obliqueTreeVis.draw();
    let featureTable = state.obliqueTreeVis.computeGlobalFeatureContribution();
    emit("emitFeatureTable", featureTable);
}


watch(() => props.selectedPoints, (newValue, oldValue) => {
    // Compute related links nad nodes from selected points
    state.exposedFeatureContributions = state.obliqueTreeVis.renderSelectionEffect(newValue);
    // Update current oblique tree view
    state.obliqueTreeVis.update();
    // Select all related svg groups and apply opacity 1 when selection process is over
    if (oldValue.length !== 0 && newValue.length === 0) {
        state.obliqueTreeVis.update("reset");
    }
});

watch(() => props.selectedDataset, (val) => {
    initializeObliqueTree();
});

watch(() => props.selectedModel, (val) => {
    initializeObliqueTree();
});

watch(() => state.exposedFeatureContributions, (val) => {
    emit("emitExposedFeatureContributions", val);
});

watch(() => props.selectedFeatures, (newVal, oldVal) => {
    // TODO: update oblique tree view using featureUpdate
    let res = [];
    Object.entries(newVal).forEach(([key, value]) => {
        if (value) {
            res.push(key);
        }
    });
    state.obliqueTreeVis.renderSelectedFeaturesUpdate(res);
    
},
{
    deep: true,
    immediate: false
});

</script>
<style scoped>
</style>