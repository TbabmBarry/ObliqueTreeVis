<template>
    <div class="w-full h-screen">
        <div class="m-2">
            <div class="col-span-1 titles">
                Global Feature View
            </div>
        </div>
        <hr style="height:1px" />

    </div>
</template>
<script setup>
import _ from 'lodash';
import { inject, reactive, toRefs, watch, onMounted } from "vue";
import { getDatasetChangeSelects } from "@/api/metrics.js";

let d3 = inject("d3");

const props = defineProps({
    selectedDataset: {
        type: String,
        default: "iris"
    }
});

const state = reactive({
    trainingData: {},
    featureTable: [],
});

onMounted(async() => {
    initGlobalFeatureView("penguins");
});

async function initGlobalFeatureView(dataset_name) {
    // remove all existing elements
    d3.select("#feature").selectAll("*").remove();
    let req = {
        dataset_name: dataset_name
    };
    state.trainingData = await getDatasetChangeSelects(req)
        .then(function (bundle) {
            let { trainingSet, labelSet } = bundle.data;
            trainingSet = dataset_name === "penguins" ? trainingSet.map(([f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8]) => ({ f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8 }))
                    : trainingSet.map(([f_1, f_2, f_3, f_4]) => ({ f_1, f_2, f_3, f_4 }));
            return trainingSet;
        })
        .catch(function (error) {
            console.log(error);
        }); 
    const features = Object.keys(state.trainingData[0]);
    const featureData = {};
    features.forEach(feature => {
        featureData[feature] = [];
    });
    state.trainingData.forEach(obj => {
        features.forEach(feature => featureData[feature].push(obj[feature]));
    })
    features.forEach(feature => {
        state.featureTable.push({
            name: feature,
            min: Math.min(...featureData[feature]),
            max: Math.max(...featureData[feature]),
            mean: _.mean(featureData[feature]),
            median: d3.quantile(featureData[feature], 0.5),
            q3: d3.quantile(featureData[feature], 0.75),
            q1: d3.quantile(featureData[feature], 0.25),
            iqr: d3.quantile(featureData[feature], 0.75) - d3.quantile(featureData[feature], 0.25),
        })
    });
}

watch(() => props.selectedDataset, (newVal, oldVal) => {
    initGlobalFeatureView(newVal);
},
{
    immediate: false
});

watch(() => state.trainingData, (newVal, oldVal) => {
},
{
    immediate: false
});

</script>
<style scoped>
</style>