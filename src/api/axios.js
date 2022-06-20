import axios from 'axios';
import qs from 'qs';
export default function (config, options) {
    // Determine if loading should be displayed. Configuration is required when adding {loading:true} default false
    let loadingStatus = options?.loading || undefined;
    // Determining whether to display a message. Configuration is required when adding {message:true} default false
    let messageStatus = options?.message || undefined;
    // Determine if unformatted data is displayed. Configuration is required when adding {rawData:true} default false
    let rawData = options?.rawData || false;
    const service = axios.create({
        // baseURL: 'xxxxx', // Set a uniform request prefix
        timeout: 100000, // Set a uniform timeout duration
        headers: {
            'Content-Type': 'application/json',
        },
        transformRequest: [function (data, headers) {
            // Customized conversion of data
            // console.log("check: ", data, qs.stringify(data));
            // return qs.stringify(data)
            return JSON.stringify(data);
        }],

        // `transformResponse` Allow modification of response data before passing to then/catch
        transformResponse: [function (data) {
            // Customized conversion of data
            let res = JSON.parse(data);// Return data type conversion
            // if (res.code == 200) {
            //     !messageStatus || ElMessage.success(res.message)
            // } else if (res.code == 500) {
            //     !messageStatus || ElMessage.error(res.message)
            // } else {
            //     !messageStatus || ElMessage.warning(res.message)
            // }
            return res;
        }],
        // `paramsSerializer` is a function responsible for the serialization of `params`
        // (e.g. https://www.npmjs.com/package/qs, http://api.jquery.com/jquery.param/)
        paramsSerializer: function (params) {
            return qs.stringify(params, { arrayFormat: 'brackets' });
        },
        // `withCredentials` indicates whether credentials are required for cross-domain requests
        withCredentials: false, // default
    });
    return service(config);

};
