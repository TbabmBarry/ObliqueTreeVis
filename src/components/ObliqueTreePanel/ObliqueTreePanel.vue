<template>
    <div class="w-full h-screen">
        <!-- <div class="m-2">
            <div class="col-span-1 titles">
                Oblique Tree View
            </div>
        </div>
        <hr style="height:1px" /> -->
        <div class="w-full h-screen inline-block overflow-auto" id="vis"></div>
    </div>
</template>
<script setup>
import { onMounted, inject, ref, toRaw } from "vue";
import Odt from '../../libs/ObliqueDecisionTree/ObliqueDecisionTree';
import BivariateDecisionTree, { parseCSV } from '../../libs/ObliqueDecisionTreeExporter/ObliqueDecisionTreeExporter';


let d3 = inject("d3");

const rootNode = ref({});

onMounted(async () => {
    let opts = null;
    // let data = {
    //     "name": "Top Level",
    //     "distribution": [115,99,52],
    //     "children": [
    //         { 
    //             "name": "Level 2: A",
    //             "distribution": [115,0,52],
    //             "children": [
    //                 { 
    //                     "name": "Son of A",
    //                     "distribution": [115,0,0],
    //                     "samples": [
    //                         {"Year": "2001", "Height": "4.41", "Length": "3.17"},
    //                         {"Year": "2003", "Height": "3.81", "Length": "7.33"},
    //                         {"Year": "2004", "Height": "2.11", "Length": "6.75"},
    //                     ]     
    //                 },
    //                 {
    //                     "name": "Daughter of A",
    //                     "distribution": [0,0,52],
    //                     "samples": [
    //                         {"Year": "2002", "Height": "3.21", "Length": "4.51"},
    //                         {"Year": "1998", "Height": "3.89", "Length": "8.05"},
    //                         {"Year": "2007", "Height": "2.69", "Length": "5.44"},
    //                     ]
    //                 }
    //             ],
    //             "samples": [
    //                 {"Year": "2002", "Height": "3.21", "Length": "4.51"},
    //                 {"Year": "2001", "Height": "4.41", "Length": "3.17"},
    //                 {"Year": "2003", "Height": "3.81", "Length": "7.33"},
    //                 {"Year": "2004", "Height": "2.11", "Length": "6.75"},
    //                 {"Year": "1998", "Height": "3.89", "Length": "8.05"},
    //                 {"Year": "2007", "Height": "2.69", "Length": "5.44"},
    //             ]
    //         },
    //         { 
    //             "name": "Level 2: B",
    //             "distribution": [0,99,0],
    //             "samples": [
    //                 {"Year": "1997", "Height": "4.11", "Length": "2.34"},
    //                 {"Year": "2000", "Height": "5.21", "Length": "2.38"},
    //             ]
    //         }
    //     ],
    //     "samples": [
    //         {"Year": "1997", "Height": "4.11", "Length": "2.34"},
    //         {"Year": "2000", "Height": "5.21", "Length": "2.38"},
    //         {"Year": "2002", "Height": "3.21", "Length": "4.51"},
    //         {"Year": "2001", "Height": "4.41", "Length": "3.17"},
    //         {"Year": "2003", "Height": "3.81", "Length": "7.33"},
    //         {"Year": "2004", "Height": "2.11", "Length": "6.75"},
    //         {"Year": "1998", "Height": "3.89", "Length": "8.05"},
    //         {"Year": "2007", "Height": "2.69", "Length": "5.44"},
    //     ]
    // };
    const promiseTrainX = d3.csv("http://127.0.0.1:8080/train_x.csv");
    const promiseTrainY = d3.csv("http://127.0.0.1:8080/train_y.csv");
    rootNode.value = await Promise.all([promiseTrainX, promiseTrainY])
        .then(function (bundle) {
            const builder = {
                trainingSet: parseCSV(bundle[0]).map(row => row.slice(), "float"),
                labelSet: parseCSV(bundle[1]).map(row => row.slice(), "int"),
                nodeTreePath: ["root", "l", "lr", "lrl"],
                decisionNodes: [
                    [0, -0.699623, 0, 1.000000, 0, 0, 0, 0, -0.464679],
                    [-3.413128, 0, 0, 0, 1.000000, 0, 0, 0, 0.388552],
                    [-1.185092, 0, 0, 0, 1.000000, 0, 0, 0, 0.296273],
                    [0, 1.000000, 0, 0, 0, 0, 0, 0, -0.145013]
                ]
            };
            // Re-classify
            const exporter = new BivariateDecisionTree(builder);
            exporter.init();
            return exporter.output;
        }).catch(function (error) {
            console.log("ERROR: ", error);
        });
    let odt = new Odt(["#vis"]);
    odt.init();
    odt.setDataAndOpts(opts, rootNode.value);

})
</script>
<style scoped>
</style>