import request from "./axios";

export function getTrainingData(data) {
    return request({
        url: "/dataset",
        method: "get",
        paramas: data
    })
};