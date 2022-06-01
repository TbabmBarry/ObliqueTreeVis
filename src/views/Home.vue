<template>
    <div class="grid grid-cols-6 gap-4">
        <div class="col-start-1 col-end-3">
            <DataRepresentationView />
        </div>
        <div class="col-start-3 col-end-7">
            <ObliqueTreeView />
        </div>
    </div>
</template>
<script setup>
import ObliqueTreeView from "../components/ObliqueTreeView/ObliqueTreeView.vue";
import DataRepresentationView from "../components/DataRepresentationView/DataRepresentationView.vue";

</script>
<style scoped>
    
</style>