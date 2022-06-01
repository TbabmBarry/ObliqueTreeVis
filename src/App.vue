<script setup>
import Home from './views/Home.vue';
import * as d3 from 'd3';
import { provide } from 'vue';

provide('d3', d3);

</script>

<template>
<div class="container mx-auto px-4">
  <Home />
</div>
</template>

<style>

</style>
