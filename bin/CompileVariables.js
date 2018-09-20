"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function compileVariables(buildFlags, projectSettings, userSettings, dotEnv, typescriptConfiguration) {
    let variables = {
        root: projectSettings.root,
        input: projectSettings.input,
        output: projectSettings.output,
        jsOut: projectSettings.jsOut,
        cssOut: projectSettings.cssOut,
        alias: projectSettings.alias,
        externals: projectSettings.externals,
        env: Object.assign(dotEnv, buildFlags.env),
        packageManager: userSettings.packageManager,
        muteNotification: userSettings.muteNotification,
        production: buildFlags.production,
        sourceMap: buildFlags.sourceMap,
        watch: buildFlags.watch,
        stats: buildFlags.stats,
        verbose: buildFlags.verbose,
        hot: buildFlags.hot,
        port1: projectSettings.port1,
        port2: projectSettings.port2,
        typescriptConfiguration: typescriptConfiguration
    };
    if (variables.hot) {
        variables.production = false;
        variables.watch = true;
    }
    if (variables.production === false || variables.watch) {
        variables.stats = false;
    }
    return variables;
}
exports.compileVariables = compileVariables;
