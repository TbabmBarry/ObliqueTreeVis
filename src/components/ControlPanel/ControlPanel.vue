<template>
    <div class="h-full m-2">
        <div class="titles">
            Model Info: 
        </div>
        <div class="leading-normal gap my-2">
            <span class="col-span-1 titles align-bottom">Type: </span>
            <span class="col-span-2 info align-bottom">Bivariate Decision Tree</span>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-3 gap my-2">
            <div class="col-span-1 titles">
                Datasets: 
            </div>
            <div class="col-span-2">
                <a-select
                    ref="select"
                    v-model:value="value1"
                    style="width:120px"
                    size="small"
                    :options="options1"
                    @focus="focus"
                    @change="handleChange"
                ></a-select>
            </div>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-3 gap my-2">
            <div class="w-full h-full overflow-auto" id="class-overview"></div>
        </div>
    </div>
</template>
<script setup>
import { reactive, ref, toRefs, inject, watch, onMounted } from "vue";
import { getDatasetChangeSelects } from "@/api/metrics.js";

let d3 = inject("d3");

const emit = defineEmits(["emitSelectedDatasetChanged"]);

const props = defineProps({
    selectedPoints: {
        type: Array,
        default: () => []
    }
});

const state = reactive({
    value1: ref('penguins'),
    options1: ref([{
        value: 'iris',
        label: 'Iris Data',
    }, {
        value: 'penguins',
        label: 'Penguins Data',
    }]),
    labelSet: [],
    classCounts: {}
});

onMounted(async () => {
    initiateClassOverview();
});

const focus = () => {
    // console.log("focus");
};

const handleChange = (value) => {
    initiateClassOverview();
    emit("emitSelectedDatasetChanged", value);
};

const occurrence = (arr) => {
    const counts = {};
    for (const num of arr) {
        counts[num] = counts[num] ? counts[num] + 1 : 1;
    }
    return counts;
}

async function initiateClassOverview () {
    d3.select("#class-overview").selectAll("*").remove();
    let req = {
        dataset_name: state.value1
    };
    state.labelSet = await getDatasetChangeSelects(req)
        .then(function (bundle) {
            let { trainingSet, labelSet } = bundle.data;
            return labelSet.slice();
        }).catch(function (error) {
            console.log("ERROR: ", error);
        });
    state.classCounts = occurrence(state.labelSet);
}

watch(() => props.selectedPoints, (newValue, oldValue) => {
    console.log("selectedPoints changed", newValue);

}, { immediate: false });

let { value1, options1 } = toRefs(state);
</script>
<style scoped>
</style>