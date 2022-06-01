<template>
<div class="container m-auto p-2 w-full h-full max-w-screen-2xl">
    <div class="grid grid-cols-6 gap-2">
        <div class="col-start-1 col-end-3">
            <div class="grid grid-rows-2 grid-flow-col gap-2 h-full">
                <div class="grid grid-rows-6 grid-flow-col gap border border-gray-800/100">
                    <ProjectionView />
                </div>
                <div class="grid grid-rows-6 grid-flow-col gap border border-gray-800/100">
                    <TableDataView />
                </div>
            </div>
        </div>
        <div class="col-start-3 col-end-7">
            <div class="border border-gray-800/100">
                <ObliqueTreeView />
            </div>
        </div>
    </div>
</div>
</template>
<script setup>
import ObliqueTreeView from "../components/ObliqueTreeView/ObliqueTreeView.vue";
import ProjectionView from "../components/DataRepresentationView/ProjectionView.vue";
import TableDataView from "../components/DataRepresentationView/TableDataView.vue";

</script>
<style scoped>
</style>