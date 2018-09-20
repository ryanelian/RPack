"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = __importDefault(require("ava"));
const CompileVariables_1 = require("./CompileVariables");
ava_1.default('Compile Variables: Simple', t => {
    let result = CompileVariables_1.compileVariables({
        env: {
            foo: 'bar'
        },
        hot: false,
        production: true,
        watch: false,
        sourceMap: true,
        stats: true,
        verbose: false
    }, {
        root: __dirname,
        input: 'client',
        output: 'wwwroot',
        jsOut: 'ipack.js',
        cssOut: 'ipack.css',
        alias: {},
        externals: {},
        port1: 0,
        port2: 0
    }, {
        muteNotification: false,
        packageManager: 'yarn'
    }, {
        hello: 'world'
    });
    let expected = {
        root: __dirname,
        input: 'client',
        output: 'wwwroot',
        jsOut: 'ipack.js',
        cssOut: 'ipack.css',
        alias: {},
        externals: {},
        port1: 0,
        port2: 0,
        muteNotification: false,
        packageManager: 'yarn',
        env: {
            foo: 'bar',
            hello: 'world'
        },
        hot: false,
        production: true,
        watch: false,
        sourceMap: true,
        stats: true,
        verbose: false
    };
    t.deepEqual(result, expected);
});
ava_1.default('Compile Variables: Overrides', t => {
    let result = CompileVariables_1.compileVariables({
        env: {
            foo: 'bar',
        },
        hot: true,
        production: true,
        watch: false,
        sourceMap: false,
        stats: true,
        verbose: true
    }, {
        root: __dirname,
        input: 'src',
        output: 'www',
        jsOut: 'bundle.js',
        cssOut: 'bundle.css',
        alias: {
            'vue': 'vue/dist/vue.esm'
        },
        externals: {
            jquery: '$'
        },
        port1: 20178,
        port2: 20179
    }, {
        muteNotification: true,
        packageManager: 'npm'
    }, {
        foo: 'zero'
    });
    let expected = {
        root: __dirname,
        input: 'src',
        output: 'www',
        jsOut: 'bundle.js',
        cssOut: 'bundle.css',
        alias: {
            'vue': 'vue/dist/vue.esm'
        },
        externals: {
            jquery: '$'
        },
        port1: 20178,
        port2: 20179,
        muteNotification: true,
        packageManager: 'npm',
        env: {
            foo: 'bar'
        },
        hot: true,
        production: false,
        watch: true,
        sourceMap: false,
        stats: false,
        verbose: true
    };
    t.deepEqual(result, expected);
});
