import request from "./axios";

export function getDataset(data) {
    return request({
        url: "/api/get_dataset",
        method: "get",
        paramas: data
    })
};

export function getDatasetChangeSelects(data) {
    return request({
        url: "/api/dataset_selected",
        method: "post",
        data: data
    },{
        message:false,
        loading:false
      })
}


export function getAvailDatasetsList(data) {
    return request({
        url: "/api/select",
        method: "get",
        params: data
    })
};

export function getProjection(data) {
    return request({
        url: "/api/get_projection",
        method: "get",
        params: data
    })
};

