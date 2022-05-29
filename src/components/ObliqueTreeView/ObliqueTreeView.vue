<template>
    <div id="vis"></div>
</template>
<script setup>
import { onMounted } from "vue";
import Odt from '../../libs/ObliqueDecisionTree/ObliqueDecisionTree'


// let d3 = inject("d3");

onMounted(() => {
    let opts = null;
    let data = {
        "name": "Top Level",
        "children": [
        { 
            "name": "Level 2: A",
            "children": [
            { "name": "Son of A" },
            { "name": "Daughter of A" }
            ]
        },
        { "name": "Level 2: B" }
        ]
    };

    let odt = new Odt(["#vis"]);
    odt.init();
    odt.setDataAndOpts(opts, data);
    odt.draw();

})
</script>
<style scoped>
#vis {
    height: 500px;
    width: 500px;
}

</style>