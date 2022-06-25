<template>
    <div class="h-full">
        <div class="m-2">
            <div class="col-span-1 titles">
                Projection View
            </div>
        </div>
        <hr style="height:1px" />
        <div class="w-full h-screen overflow-auto" id="projection"></div>
    </div>
</template>
<script setup>
import { onMounted, inject, ref } from "vue";
import { getDataset } from "@/api/dataset.js";
let d3 = inject("d3");

// const rootNode = ref({});
// const trainingData = ref({});

onMounted(async() => {
    await getDataset()
        .then(function (bundle) {
            const { trainingSet, labelSet } = bundle.data;
            console.log(trainingSet, labelSet);
        }).catch((error) => {
            console.log("ERROR: ", error);
        });
})



</script>
<style scoped>
</style>