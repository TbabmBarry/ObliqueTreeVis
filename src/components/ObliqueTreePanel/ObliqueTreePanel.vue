<template>
    <div class="w-full h-screen">
        <div class="w-full h-screen inline-block overflow-auto" id="vis"></div>
    </div>
</template>
<script setup>
import { onMounted, inject, ref } from "vue";
import Odt from '@/libs/ObliqueDecisionTree/ObliqueDecisionTree';
import BivariateDecisionTree, { parseCSV } from '@/libs/ObliqueDecisionTreeExporter/ObliqueDecisionTreeExporter';
import { getTrainingData } from "@/api/dataset.js";

let d3 = inject("d3");

const rootNode = ref({});
const trainingData = ref({});

onMounted(async () => {
    let opts = null;
    // const promiseTrainX = d3.text("http://127.0.0.1:8080/train_x.csv");
    // const promiseTrainY = d3.text("http://127.0.0.1:8080/train_y.csv");
    // rootNode.value = await Promise.all([promiseTrainX, promiseTrainY])
    rootNode.value = getTrainingData()
        .then(function (bundle) {
            const { trainingSet, labelSet } = parseCSV(bundle);
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
            exporter.init();
            return exporter.output;
        }).catch(function (error) {
            console.log("ERROR: ", error);
        });
    // trainingData.value = await Promise.all([promiseTrainX, promiseTrainY])
    trainingData.value = getTrainingData()
        .then(function (bundle) {
            let { trainingSet, labelSet } = parseCSV(bundle);
            trainingSet = trainingSet.map(([f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8]) => ({ f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8 }));
            return { trainingSet, labelSet };
        });
    let odt = new Odt(["#vis"]);
    odt.init();
    odt.setDataAndOpts(opts, rootNode.value, trainingData.value);
    odt.draw();
})
</script>
<style scoped>
</style>