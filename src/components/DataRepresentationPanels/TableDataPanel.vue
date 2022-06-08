<template>
    <div class="h-full">
        <div class="table">
            <a-table
                bordered
                :dataSource="dataSource"
                :columns="columns"
                :scroll="{ y: true, x: 'max-content'}"
                size="small"
            >
            </a-table>
        </div>
    </div>
</template>
<script setup>
import { ref, reactive, toRefs } from "vue";

const state = reactive({
    dataSource: [
        {
        key: '1',
        name: 'Mike',
        age: 32,
        address: '10 Downing Street',
        },
        {
        key: '2',
        name: 'John',
        age: 42,
        address: '10 Downing Street',
        },
    ],
    columns: [
        {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        },
        {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        },
        {
        title: 'Address',
        dataIndex: 'address',
        key: 'address',
        },
    ],
});


let { dataSource, columns } = toRefs(state);
</script>
<style scoped>
    .table {
        height: fit-content;
    }
</style>