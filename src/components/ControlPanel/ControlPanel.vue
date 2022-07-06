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
            <div class="col-span-1 titles">
                Settings:
            </div>
        </div>
        <hr style="height:1px" />
        <div class="grid grid-cols-3 gap my-2">
            <div class="col-span-1 titles">
                Styles:
            </div>
        </div>
    </div>
</template>
<script setup>
import { reactive, ref, toRefs } from "vue";

const emit = defineEmits(["emitSelectedDatasetChanged"]);

const state = reactive({
    value1: ref('iris'),
    options1: ref([{
        value: 'iris',
        label: 'Iris Data',
    }, {
        value: 'penguins',
        label: 'Penguins Data',
    }]),
});

const focus = () => {
    // console.log("focus");
};

const handleChange = (value) => {
    emit("emitSelectedDatasetChanged", value);
};

let { options1 } = toRefs(state);
</script>
<style scoped>
</style>