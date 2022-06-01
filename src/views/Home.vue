<template>
    <div class="grid grid-cols-6 gap-4">
        <div class="col-start-1 col-end-3">
            <div class="grid grid-rows-2 grid-flow-col gap-4 h-full">
                <div>
                    <ProjectionView />
                </div>
                <div>
                    <TableDataView />
                </div>
            </div>
        </div>
        <div class="col-start-3 col-end-7">
            <ObliqueTreeView />
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