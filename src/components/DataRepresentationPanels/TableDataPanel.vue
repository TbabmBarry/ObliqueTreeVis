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
import { ref, reactive, toRefs } from "vue";

const state = reactive({
    pagination: false,
    tableHeight: 200,
    tableWidth: 800,
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
        },{
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
        },{
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
        },{
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
        },{
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


let { pagination, tableHeight, tableWidth, dataSource, columns } = toRefs(state);
</script>
<style scoped>
.table {
    height: fit-content;
}
</style>