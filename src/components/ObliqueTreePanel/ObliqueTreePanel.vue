<template>
    <div class="w-full h-screen">
        <div class="w-full h-screen overflow-auto" id="vis"></div>
    </div>
</template>
<script setup>
import { onMounted, inject, reactive, watch } from "vue";
import Odt from '@/libs/ObliqueDecisionTree/ObliqueDecisionTree';
import BivariateDecisionTree from '@/libs/ObliqueDecisionTreeExporter/ObliqueDecisionTreeExporter';
import { getDataset } from "@/api/metrics.js";

let d3 = inject("d3");

const props = defineProps({
    selectedPoints: {
        type: Array,
        default: () => []
    },
});

const state = reactive({
    rootNode: {},
    trainingData: {},
    obliqueTreeVis: null
})

onMounted(async () => {
    let opts = null;
    state.rootNode = await getDataset()
        .then(function (bundle) {
            const { trainingSet, labelSet } = bundle.data;
            const builder = {
                trainingSet,
                labelSet,
                nodeTreePath: ["root", "l", "lr", "lrl"],
                decisionNodes: [
                    [0, -0.699623, 0, 1.000000, 0, 0, 0, 0, -0.464679],
                    [-3.413128, 0, 0, 0, 1.000000, 0, 0, 0, 0.388552],
                    [-1.185092, 0, 0, 0, 1.000000, 0, 0, 0, 0.296273],
                    [0, 1.000000, 0, 0, 0, 0, 0, 0, -0.145013]
                ]
            };
            // Re-classify
            const exporter = new BivariateDecisionTree(builder);
            exporter.compute();
            return exporter.output;
        }).catch(function (error) {
            console.log("ERROR: ", error);
        });
    state.trainingData = await getDataset()
        .then(function (bundle) {
            let { trainingSet, labelSet } = bundle.data;
            trainingSet = trainingSet.map(([f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8]) => ({ f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8 }));
            return { trainingSet, labelSet };
        });
    state.obliqueTreeVis = new Odt(["#vis"]);
    state.obliqueTreeVis.init();
    state.obliqueTreeVis.setDataAndOpts(opts, state.rootNode, state.trainingData);
    state.obliqueTreeVis.draw();
})

watch(() => props.selectedPoints, (newValue, oldValue) => {
    const { exposedFlowLinks, uniqueDecisionPaths } = state.obliqueTreeVis.renderSelectionEffect(newValue);
    d3.selectAll("path.link")
            .style("opacity", 0.6);
    exposedFlowLinks.forEach((exposedFlowLink) => {
        d3.selectAll(`path.link#${exposedFlowLink}`)
            .style("opacity", 1);
    });
});
</script>
<style scoped>
</style>