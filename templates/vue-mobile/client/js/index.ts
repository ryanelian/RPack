﻿import ES6Promise from 'es6-promise';
ES6Promise.polyfill();

import ons from 'onsenui';
if (ons.platform.isIPhoneX()) {
    // https://onsen.io/v2/guide/iphonex.html#iphone-x
    document.documentElement.setAttribute('onsflag-iphonex-portrait', '');
    document.documentElement.setAttribute('onsflag-iphonex-landscape', '');
}

import './vue-project';
