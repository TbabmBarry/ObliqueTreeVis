import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import App from './App.vue';
import './index.css'

const app = createApp(App);
app.config.productionTip = false;

app.use(Antd).mount("#app");
