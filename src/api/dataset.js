import request from "./axios";

export function getDataset(data) {
    return request({
        url: "/api/getDataset",
        method: "get",
        paramas: data
    })
};

export function getAvailDatasetsList(data) {
    return request({
        url: "/api/select",
        method: "get",
        params: data
    })
};