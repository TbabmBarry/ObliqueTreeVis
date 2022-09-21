<template>
    <div class="w-full h-screen flex flex-col">
        <div class="w-full px-2 flex text-xl justify-center text-white font-bold rounded header border-double border-2 border-slate-100 bg-slate-400">Oblique Tree View</div>
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
        iris: {
            bivariate: ["root","r", "rr", "rrr"],
            univariate: ["root","r","rl","rll","rlr","rlrr","rr","rrl"]
        },
        penguins: {
            bivariate: ["root", "l", "lr", "lrl"],
            univariate: ["root","l","ll","lll","llll","llr","lr","lrl","lrr","lrrl","r","rl"]
        },
        wine: {
            bivariate: ["root", "l", "ll", "lr", "r"],
            univariate: ["root","l","ll","lll","llr","lr","lrr","lrrr","r","rl","rr"]
        },
    },
    decisionNodes: {
        iris: {
            bivariate: [
                [0,0,1,0,0.743434],
                [0,0,0.134785,0.288354,-0.209121],
                [0,0.078456,0,-0.536789,0.407687],
                [-0.847049,1,0,0,1.03165]
            ],
            univariate: [
                [0,0,0,1,0.526],
                [0,0,0,1,-0.725],
                [0,0,1,0,-0.678],
                [0,0,0,1,-0.593],
                [0,0,0,1,-0.462],
                [1,0,0,0,-1.341],
                [0,0,1,0,-0.621],
                [0,1,0,0,-0.098]
            ]
        },
        penguins: {
            bivariate: [
                [0, -0.156291, 1, 0, 0, 0, 0, 0, -0.606899],
                [0.343477, -0.184071, 0, 0, 0, 0, 0, 0, 0.1443],
                [0, 0, 0, 0, 0, 0, 1, 0, -0.270662],
                [1, 0, 0, 0, 0, 0, 0, 0, -0.569039]
            ],
            univariate: [
                [0,0,1,0,0,0,0,0,-0.395],
                [1,0,0,0,0,0,0,0,0.118],
                [1,0,0,0,0,0,0,0,0.301],
                [0,1,0,0,0,0,0,0,0.262],
                [1,0,0,0,0,0,0,0,0.823],
                [0,0,0,0,1,0,0,0,0.009],
                [0,0,0,0,0,0,1,0,-0.271],
                [1,0,0,0,0,0,0,0,-0.587],
                [1,0,0,0,0,0,0,0,-0.12],
                [0,1,0,0,0,0,0,0,-0.882],
                [0,0,0,0,0,1,0,0,-0.021],
                [0,1,0,0,0,0,0,0,-0.908],
            ]
        },
        wine: {
            bivariate: [
                [0,0,0,0,0,0,0.292206,0,0,0,0,0,1,-0.125955],
                [0,0,0,0,0,0,-0.493421,0,0,1,0,0,0,0.123355],
                [0,0,0,0,0,0,0,0,0,-1.785902,1,0,0,0],
                [0,0,0,0,0,0,1,0,0,0,0,0,0,0.631766],
                [0.267719,0,0,0,0,-0.187168,0,0,0,0,0,0,0,0.220634],
            ],
            univariate: [
            [0,0,0,0,0,0,0,0,0,0,0,0,1,-0.026],
            [0,0,0,0,0,0,0,0,0,0,0,1,0,0.702],
            [0,0,0,0,0,0,0,0,0,0,1,0,0,0.098],
            [0,0,0,0,0,0,1,0,0,0,0,0,0,0.451],
            [0,0,1,0,0,0,0,0,0,0,0,0,0,-0.305],
            [0,0,0,0,0,0,1,0,0,0,0,0,0,1.239],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,-0.215],
            [0,1,0,0,0,0,0,0,0,0,0,0,0,0.19],
            [0,0,0,0,0,0,1,0,0,0,0,0,0,-0.136],
            [0,1,0,0,0,0,0,0,0,0,0,0,0,0.226],
            [0,0,0,0,1,0,0,0,0,0,0,0,0,-2.511],
            ]
        },
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
            labelSet.shift();
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
            labelSet.shift();
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