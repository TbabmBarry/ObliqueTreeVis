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
    trainingData: {}
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
}

watch(() => props.selectedDataset, (newVal, oldVal) => {
    initGlobalFeatureView(newVal);
},
{
    immediate: false
});

watch(() => state.trainingData, (newVal, oldVal) => {
    console.log(newVal);
},
{
    immediate: false
});

</script>
<style scoped>
</style>