<template>
<div class="container m-auto p-2 w-full min-h-screen min-w-full max-w-screen-2xl">
    <div class="grid grid-cols-5 gap-2 min-h-screen">
        <div class="col-start-1 col-end-2">
            <div class="grid grid-rows-3 grid-flow-col gap-2 h-screen">
                <div class="grid row-span-2 grid-flow-col gap border border-gray-800/100">
                    <ControlPanel />
                </div>
                <div class="grid row-span-1 grid-flow-col gap border border-gray-800/100">
                    <ProjectionPanel />
                </div>
            </div>
        </div>
        <div class="col-start-2 col-end-5">
            <div class="border border-gray-800/100 h-screen">
                <ObliqueTreePanel />
            </div>
        </div>
        <div class="col-start-5 col-end-6">
            <div class="grid grid-rows-3 grid-flow-col gap-2 h-screen">
                <div class="grid row-span-2 grid-flow-col gap border border-gray-800/100">
                    <FeaturePanel />
                </div>
                <div class="grid row-span-1 grid-flow-col gap border border-gray-800/100">
                    <TableDataPanel />
                </div>
            </div>
        </div>
    </div>
</div>
</template>
<script setup>
import ObliqueTreePanel from "../components/ObliqueTreePanel/ObliqueTreePanel.vue";
import ControlPanel from "../components/ControlPanel/ControlPanel.vue";
import ProjectionPanel from "../components/DataRepresentationPanels/ProjectionPanel.vue";
import TableDataPanel from "../components/DataRepresentationPanels/TableDataPanel.vue";
import FeaturePanel from "../components/FeaturePanel/FeaturePanel.vue";
import TableDataPanel1 from "../components/DataRepresentationPanels/TableDataPanel.vue";
</script>
<style scoped>
</style>