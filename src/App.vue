<script setup>
import Home from './views/Home.vue';
import * as d3 from 'd3';
import { provide } from 'vue';

provide('d3', d3);

</script>

<template>
  <Home />
</template>

<style scoped>

</style>
