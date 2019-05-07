import '@babel/polyfill'
import Vue from 'vue'
import App from './App.vue'
import axios from './axios-auth'
import Vuelidate from 'vuelidate'
import router from './router'
import store from './store'
import './plugins/vuetify'
import './registerServiceWorker'
import { API_URL } from '../public/config/configuration.js'

Vue.use(Vuelidate)
Vue.config.productionTip = false

axios.defaults.baseURL = API_URL
console.log('Setting axios.baseURL to: ' + axios.defaults.baseURL)

window.addEventListener('message', function (e) {
  if (e.origin === process.env.VUE_APP_AUTH_URL) {
    sessionStorage.setItem('KEYCLOAK_TOKEN', e.data)
    sessionStorage.setItem('REDIRECTED', 'false')
  }
})

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
