import Vue from 'vue';
import BootstrapVue from 'bootstrap-vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import Hello from './components/Hello.vue';

Vue.use(BootstrapVue);
Vue.component('validation-provider', ValidationProvider);
Vue.component('validation-observer', ValidationObserver);
Vue.component('fa', FontAwesomeIcon);

// components must be registered BEFORE the app root declaration
Vue.component('hello', Hello);

// bootstrap the Vue app from the root element <div id="app"></div>
new Vue().$mount('#app');
