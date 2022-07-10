<template>
<div class="container m-auto p-2 w-full min-h-screen min-w-full max-w-screen-2xl">
    <div class="grid grid-cols-3 gap-2 min-h-screen">
        <div class="col-start-1 col-end-3 border border-gray-800/100">
            <ObliqueTreePanel :selectedPoints="selectedPoints" :selectedDataset="selectedDataset" />
        </div>
        <div class="col-start-3 col-end-4">
            <div class="grid grid-rows-2 grid-flow-col gap-2 h-screen">
                <div class="grid row-span-1 grid-flow-col gap border border-gray-800/100">
                    <ProjectionPanel @emit-selected-points-changed="selectedPointsChanged" :selectedDataset="selectedDataset" />
                </div>
                <div class="grid row-span-1 grid-flow-col gap border border-gray-800/100">
                    <ControlPanel @emit-selected-dataset-changed="selectedDatasetChanged" />
                </div>
            </div>
        </div>
    </div>
    <!-- <div class="grid grid-cols-4 gap-2 min-h-screen">
        <div class="col-start-1 col-end-2">
            <div class="grid grid-rows-2 grid-flow-col gap-2 h-screen">
                <div class="grid row-span-1 grid-flow-col gap border border-gray-800/100">
                    <ControlPanel />
                </div>
                <div class="grid row-span-1 grid-flow-col gap border border-gray-800/100">
                    <ProjectionPanel />
                </div>
            </div>
        </div>
        <div class="col-start-2 col-end-4">
            <div class="border border-gray-800/100 h-screen">
                <ObliqueTreePanel />
            </div>
        </div>
        <div class="col-start-4 col-end-5">
            <div class="grid grid-rows-2 grid-flow-col gap-2 h-screen">
                <div class="grid row-span-1 grid-flow-col gap border border-gray-800/100">
                    <FeaturePanel />
                </div>
                <div class="grid row-span-1 grid-flow-col gap border border-gray-800/100">
                    <TableDataPanel />
                </div>
            </div>
        </div>
    </div> -->
    <div class="border border-gray-800/100 my-2 min-w-full max-w-screen-2xl">      
        <TableDataPanel :selectedPoints="selectedPoints" :selectedDataset="selectedDataset" />
    </div>
</div>
</template>
<script setup>
import { reactive, toRefs } from "vue";
import ObliqueTreePanel from "../components/ObliqueTreePanel/ObliqueTreePanel.vue";
import ControlPanel from "../components/ControlPanel/ControlPanel.vue";
import ProjectionPanel from "../components/DataRepresentationPanels/ProjectionPanel.vue";
import TableDataPanel from "../components/DataRepresentationPanels/TableDataPanel.vue";
// import FeaturePanel from "../components/FeaturePanel/FeaturePanel.vue";

const state = reactive({
    selectedPoints: [],
    selectedDataset: "penguins"
});

const selectedPointsChanged = (selectedPoints) => {
    state.selectedPoints = selectedPoints;
}

const selectedDatasetChanged = (selectedDataset) => {
    state.selectedDataset = selectedDataset;
}
const { selectedPoints, selectedDataset } = toRefs(state);
</script>
<style scoped>
</style>