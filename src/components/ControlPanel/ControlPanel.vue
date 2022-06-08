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
const state = reactive({
    value1: ref('lucy'),
    options1: ref([{
        value: 'jack',
        label: 'Jack',
    }, {
        value: 'lucy',
        label: 'Lucy',
    }, {
        value: 'disabled',
        label: 'Disabled',
        disabled: true,
    }, {
        value: 'yiminghe',
        label: 'Yiminghe',
    }]),
});

const focus = () => {
    console.log("focus");
};

const handleChange = (value) => {
    console.log(`selected${value}`);
};

let { options1 } = toRefs(state);
</script>
<style scoped>
.titles {
  text-align: start;
  font-size: 14px;
  font-weight: 500;
  color: #1e2225;
}

.info {
  text-align: start;
  font-size: 12px;
  font-weight: 500;
  color: #323435;
}
</style>