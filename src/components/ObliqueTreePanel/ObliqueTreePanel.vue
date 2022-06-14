<template>
    <div class="w-full h-screen">
        <!-- <div class="m-2">
            <div class="col-span-1 titles">
                Oblique Tree View
            </div>
        </div>
        <hr style="height:1px" /> -->
        <div class="w-full h-screen inline-block" id="vis"></div>
    </div>
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
                    { 
                        "name": "Son of A",
                        "samples": [
                            {"Year": "2001", "Height": "4.41", "Length": "3.17"},
                            {"Year": "2003", "Height": "3.81", "Length": "7.33"},
                            {"Year": "2004", "Height": "2.11", "Length": "6.75"},
                        ]     
                    },
                    {
                        "name": "Daughter of A",
                        "samples": [
                            {"Year": "2002", "Height": "3.21", "Length": "4.51"},
                            {"Year": "1998", "Height": "3.89", "Length": "8.05"},
                            {"Year": "2007", "Height": "2.69", "Length": "5.44"},
                        ]
                    }
                ],
                "samples": [
                    {"Year": "2002", "Height": "3.21", "Length": "4.51"},
                    {"Year": "2001", "Height": "4.41", "Length": "3.17"},
                    {"Year": "2003", "Height": "3.81", "Length": "7.33"},
                    {"Year": "2004", "Height": "2.11", "Length": "6.75"},
                    {"Year": "1998", "Height": "3.89", "Length": "8.05"},
                    {"Year": "2007", "Height": "2.69", "Length": "5.44"},
                ]
            },
            { 
                "name": "Level 2: B",
                "samples": [
                    {"Year": "1997", "Height": "4.11", "Length": "2.34"},
                    {"Year": "2000", "Height": "5.21", "Length": "2.38"},
                ]
            }
        ],
        "samples": [
            {"Year": "1997", "Height": "4.11", "Length": "2.34"},
            {"Year": "2000", "Height": "5.21", "Length": "2.38"},
            {"Year": "2002", "Height": "3.21", "Length": "4.51"},
            {"Year": "2001", "Height": "4.41", "Length": "3.17"},
            {"Year": "2003", "Height": "3.81", "Length": "7.33"},
            {"Year": "2004", "Height": "2.11", "Length": "6.75"},
            {"Year": "1998", "Height": "3.89", "Length": "8.05"},
            {"Year": "2007", "Height": "2.69", "Length": "5.44"},
        ]
    };

    let odt = new Odt(["#vis"]);
    odt.init();
    odt.setDataAndOpts(opts, data);
    odt.draw();

})
</script>
<style scoped>
</style>