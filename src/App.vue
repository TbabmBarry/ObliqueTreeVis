<script setup>
import ObliqueTreeView from "./components/ObliqueTreeView/ObliqueTreeView.vue";
import * as d3 from 'd3';
import { provide } from 'vue';

provide('d3', d3);

</script>

<template>
<div class="container mx-auto px-4">
  <ObliqueTreeView />
</div>
</template>

<style>

</style>
