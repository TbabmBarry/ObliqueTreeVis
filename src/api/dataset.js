import request from "./axios";

export function getTrainingData(data) {
    return request({
        url: "/api/dataset",
        method: "get",
        paramas: data
    })
};