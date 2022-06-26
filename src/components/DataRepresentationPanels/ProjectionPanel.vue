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
import { getProjection } from "@/api/metrics.js";
let d3 = inject("d3");

// const rootNode = ref({});
// const trainingData = ref({});

onMounted(async() => {
    await getProjection()
        .then(function (res) {
            const projections = res.data;
            console.log(projections);
        }).catch((error) => {
            console.log("ERROR: ", error);
        });
})



</script>
<style scoped>
</style>