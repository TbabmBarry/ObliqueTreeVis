<template>
<div class="container bg-slate-200 w-full h-screen min-w-full overflow-hidden">
    <div class="grid grid-cols-4 gap-2">
        <div class="col-start-1 col-end-2 grid grid-rows-2 grid-flow-col gap-2 h-screen">
            <div class="grid row-span-1 grid-flow-col gap bg-white shadow hover:shadow-lg shadow-slate-200/20 rounded-md">
                <ControlPanel @emit-selected-dataset-changed="selectedDatasetChanged" :selectedPoints="selectedPoints" />
            </div>
            <div class="grid row-span-1 grid-flow-col gap bg-white shadow hover:shadow-lg shadow-slate-200/20 rounded-md">
                <ProjectionPanel @emit-selected-points-changed="selectedPointsChanged" :selectedDataset="selectedDataset" />
            </div>
        </div>
        <div class="col-start-2 col-end-4 bg-white shadow hover:shadow-lg shadow-slate-200/20 rounded-md h-screen">
            <ObliqueTreePanel 
                @emit-feature-table="featureTableEmitted" 
                @emit-exposed-feature-contributions="exposedFeatureContributionsEmitted" 
                :selectedPoints="selectedPoints" 
                :selectedDataset="selectedDataset" />
        </div>
        <div class="col-start-4 col-end-5 bg-white shadow hover:shadow-lg shadow-slate-200/20 rounded-md h-screen">
            <FeaturePanel :featureTable="featureTable" :exposedFeatureContributions="exposedFeatureContributions" />
        </div>
    </div>
</div>
</template>
<script setup>
import { reactive, toRefs, onMounted } from "vue";
import ObliqueTreePanel from "../components/ObliqueTreePanel/ObliqueTreePanel.vue";
import ControlPanel from "../components/ControlPanel/ControlPanel.vue";
import ProjectionPanel from "../components/DataRepresentationPanels/ProjectionPanel.vue";
import FeaturePanel from "../components/FeaturePanel/FeaturePanel.vue";

const state = reactive({
    selectedPoints: [],
    selectedDataset: "penguins",
    featureTable: [],
    exposedFeatureContributions: []
});

const selectedPointsChanged = (selectedPoints) => {
    state.selectedPoints = selectedPoints;
}

const selectedDatasetChanged = (selectedDataset) => {
    state.selectedDataset = selectedDataset;
}

const featureTableEmitted = (featureTable) => {
    state.featureTable = featureTable;
}

const exposedFeatureContributionsEmitted = (exposedFeatureContributions) => {
    state.exposedFeatureContributions = exposedFeatureContributions;
}

onMounted(() => {
    
});

const { selectedPoints, selectedDataset, featureTable, exposedFeatureContributions } = toRefs(state);
</script>
<style scoped>
</style>