<template>
    <div class="h-full">
        <hr style="height:1px" />
        <div class="table">
            <a-table
                bordered
                :dataSource="dataSource"
                :columns="columns"
                :scroll="{ y: tableHeight, x: tableWidth}"
                size="small"
                :pagination="pagination"
            >
            </a-table>
        </div>
    </div>
</template>
<script setup>
import { reactive, toRefs, onMounted, watch } from "vue";
import { getDatasetChangeSelects } from "@/api/metrics.js";

const props = defineProps({
    selectedDataset: {
        type: String,
        default: "iris"
    }
});

const state = reactive({
    pagination: false,
    tableHeight: 200,
    tableWidth: 800,
    dataSource: [],
    columns: [],
});

onMounted(async () => {
    initializeDataTable("penguins");
});

const initializeDataTable = async (dataset_name) => {
    let req = {
        dataset_name: dataset_name
    };
    state.dataSource = await getDatasetChangeSelects(req)
        .then(function (bundle) {
            let { trainingSet, labelSet } = bundle.data;
            trainingSet = dataset_name === "penguins" ? trainingSet.map(([f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8]) => ({ f_1, f_2, f_3, f_4, f_5, f_6, f_7, f_8 }))
                    : trainingSet.map(([f_1, f_2, f_3, f_4]) => ({ f_1, f_2, f_3, f_4 }));
            return trainingSet;
        });
    if (dataset_name === "penguins") {
        state.columns = Array.from({length: 8}, (_, i) => `f_${i+1}`).map(feature => ({
            title: feature,
            dataIndex: feature,
            key: feature,
        }));
    } else {
        state.columns = Array.from({length: 4}, (_, i) => `f_${i+1}`).map(feature => ({
            title: feature,
            dataIndex: feature,
            key: feature,
        }));
    }
}

watch(() => props.selectedDataset,
    val => {
        initializeDataTable(val);
    },
    { immediate: false }
);

let { pagination, tableHeight, tableWidth, dataSource, columns } = toRefs(state);
</script>
<style scoped>
.table {
    height: fit-content;
}
</style>