"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const webpack = require("webpack");
const Undertaker = require("undertaker");
const vinyl = require("vinyl");
const through2 = require("through2");
const fse = require("fs-extra");
const path = require("path");
const resolve = require("resolve");
const chalk_1 = require("chalk");
const chokidar = require("chokidar");
const sourcemaps = require("gulp-sourcemaps");
const os = require("os");
const UglifyESOptions_1 = require("./UglifyESOptions");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const UglifyESWebpackPlugin = require("uglifyjs-webpack-plugin");
const GulpLog_1 = require("./GulpLog");
const PipeErrorHandler_1 = require("./PipeErrorHandler");
const To = require("./PipeTo");
const PrettyUnits_1 = require("./PrettyUnits");
class Compiler {
    constructor(settings, flags) {
        this.settings = settings;
        this.flags = flags;
        this.tasks = new Undertaker();
        this.chat();
        this.registerAllTasks();
    }
    chat() {
        GulpLog_1.default('Output to folder', chalk_1.default.cyan(this.settings.outputFolder));
        if (this.flags.production) {
            GulpLog_1.default(chalk_1.default.yellow("Production"), "Mode: Outputs will be minified.", chalk_1.default.red("(Slow build)"));
        }
        else {
            GulpLog_1.default(chalk_1.default.yellow("Development"), "Mode: Outputs will", chalk_1.default.red("NOT be minified!"), "(Fast build)");
            GulpLog_1.default(chalk_1.default.red("Do not forget to minify"), "before pushing to repository or production server!");
        }
        if (this.flags.parallel) {
            GulpLog_1.default(chalk_1.default.yellow('Parallel'), 'Mode: Build will be scaled across all logical processors.');
        }
        if (this.flags.watch) {
            GulpLog_1.default(chalk_1.default.yellow("Watch"), "Mode: Source codes will be automatically compiled on changes.");
        }
        GulpLog_1.default('Source Maps:', chalk_1.default.yellow(this.flags.sourceMap ? 'Enabled' : 'Disabled'));
    }
    output(folder) {
        return through2.obj((file, encoding, next) => __awaiter(this, void 0, void 0, function* () {
            if (file.isStream()) {
                let error = new Error('instapack output: Streaming is not supported!');
                return next(error);
            }
            if (file.isBuffer()) {
                let p = path.join(folder, file.relative);
                yield fse.outputFile(p, file.contents);
            }
            next(null, file);
        }));
    }
    registerAllTasks() {
        this.registerConcatTask();
        this.registerJsTask();
        this.registerCssTask();
        this.tasks.task('all', this.tasks.parallel('js', 'css', 'concat'));
    }
    build(taskName) {
        let run = this.tasks.task(taskName);
        run(error => { });
    }
    getParallelLoaders(cached) {
        let loaders = [];
        if (this.flags.parallel) {
            if (cached) {
                loaders.push({
                    loader: 'cache-loader',
                    options: {
                        cacheDirectory: this.settings.cacheFolder
                    }
                });
            }
            loaders.push({
                loader: 'thread-loader',
                options: {
                    workers: os.cpus().length - 1
                }
            });
        }
        return loaders;
    }
    getTypeScriptWebpackRules() {
        let loaders = this.getParallelLoaders(true);
        loaders.push({
            loader: 'ts-loader',
            options: {
                compilerOptions: {
                    noEmit: false,
                    sourceMap: this.flags.sourceMap,
                    moduleResolution: "node"
                },
                onlyCompileBundledFiles: true,
                transpileOnly: this.flags.parallel,
                happyPackMode: this.flags.parallel
            }
        });
        return {
            test: /\.tsx?$/,
            use: loaders
        };
    }
    getTemplatesWebpackRules() {
        let loaders = this.getParallelLoaders(false);
        loaders.push({
            loader: 'template-loader',
            options: {
                mode: this.settings.template
            }
        });
        return {
            test: /\.html?$/,
            use: loaders
        };
    }
    getWebpackPlugins() {
        let plugins = [];
        plugins.push(new webpack.NoEmitOnErrorsPlugin());
        if (this.flags.parallel) {
            plugins.push(new ForkTsCheckerWebpackPlugin({
                checkSyntacticErrors: true,
                async: false,
                silent: true,
                watch: this.settings.inputJsFolder
            }));
        }
        if (this.flags.production) {
            plugins.push(new webpack.DefinePlugin({
                'process.env': {
                    'NODE_ENV': JSON.stringify('production')
                }
            }));
            plugins.push(new UglifyESWebpackPlugin({
                sourceMap: this.flags.sourceMap,
                parallel: this.flags.parallel,
                uglifyOptions: UglifyESOptions_1.createUglifyESOptions()
            }));
        }
        return plugins;
    }
    get webpackConfiguration() {
        let config = {
            entry: this.settings.jsEntry,
            output: {
                filename: this.settings.jsOut,
                path: this.settings.outputJsFolder
            },
            externals: this.settings.externals,
            resolve: {
                extensions: ['.js', '.ts', '.tsx', '.htm', '.html'],
                alias: this.settings.alias
            },
            resolveLoader: {
                modules: [
                    path.resolve(__dirname, '../node_modules'),
                    path.resolve(__dirname, 'loaders')
                ]
            },
            module: {
                rules: [this.getTypeScriptWebpackRules(), this.getTemplatesWebpackRules()]
            },
            plugins: this.getWebpackPlugins()
        };
        if (this.flags.sourceMap) {
            config.devtool = (this.flags.production ? 'source-map' : 'eval-source-map');
        }
        if (this.flags.watch) {
            config.watch = true;
            config.watchOptions = {
                ignored: /node_modules/,
                aggregateTimeout: 300
            };
        }
        return config;
    }
    get webpackStatsErrorsOnly() {
        return {
            colors: true,
            assets: false,
            cached: false,
            children: false,
            chunks: false,
            errors: true,
            hash: false,
            modules: false,
            reasons: false,
            source: false,
            timings: false,
            version: false,
            warnings: true
        };
    }
    get webpackStatsJsonMinimal() {
        return {
            assets: true,
            cached: false,
            children: false,
            chunks: false,
            errors: false,
            hash: false,
            modules: false,
            reasons: false,
            source: false,
            timings: true,
            version: false,
            warnings: false
        };
    }
    registerJsTask() {
        let jsEntry = this.settings.jsEntry;
        if (!fse.existsSync(jsEntry)) {
            this.tasks.task('js', () => {
                GulpLog_1.default('Entry file', chalk_1.default.cyan(jsEntry), 'was not found.', chalk_1.default.red('Aborting JS build.'));
            });
            return;
        }
        this.tasks.task('js', () => {
            fse.removeSync(this.settings.outputJsSourceMap);
            GulpLog_1.default('Compiling JS >', chalk_1.default.yellow(UglifyESOptions_1.tryGetTypeScriptTarget()), chalk_1.default.cyan(jsEntry));
            webpack(this.webpackConfiguration, (error, stats) => {
                if (error) {
                    GulpLog_1.default(chalk_1.default.red('FATAL ERROR'), 'during JS build:');
                    console.error(error);
                    return;
                }
                let o = stats.toJson(this.webpackStatsJsonMinimal);
                if (stats.hasErrors() || stats.hasWarnings()) {
                    console.log(stats.toString(this.webpackStatsErrorsOnly));
                }
                for (let asset of o.assets) {
                    if (asset.emitted) {
                        let kb = PrettyUnits_1.prettyBytes(asset.size);
                        GulpLog_1.default(chalk_1.default.blue(asset.name), chalk_1.default.magenta(kb));
                    }
                }
                let t = PrettyUnits_1.prettyMilliseconds(o.time);
                GulpLog_1.default('Finished JS build after', chalk_1.default.green(t));
            });
        });
    }
    streamCssEntryVinyl() {
        let g = through2.obj();
        fse.readFile(this.settings.cssEntry, 'utf8').then(contents => {
            g.push(new vinyl({
                path: this.settings.cssEntry,
                contents: Buffer.from(contents),
                base: this.settings.inputCssFolder,
                cwd: this.settings.root
            }));
            g.push(null);
        });
        return g;
    }
    registerCssTask() {
        let cssEntry = this.settings.cssEntry;
        if (!fse.existsSync(cssEntry)) {
            this.tasks.task('css', () => {
                GulpLog_1.default('Entry file', chalk_1.default.cyan(cssEntry), 'was not found.', chalk_1.default.red('Aborting CSS build.'));
            });
            return;
        }
        let cssMapOptions = {
            sourceRoot: '/' + this.settings.input + '/css'
        };
        this.tasks.task('css:compile', () => {
            GulpLog_1.default('Compiling CSS', chalk_1.default.cyan(cssEntry));
            let sassImports = [this.settings.npmFolder];
            return this.streamCssEntryVinyl()
                .pipe(this.flags.sourceMap ? sourcemaps.init() : through2.obj())
                .pipe(To.Sass(this.settings.cssOut, sassImports))
                .on('error', PipeErrorHandler_1.default)
                .pipe(To.CssProcessors())
                .on('error', PipeErrorHandler_1.default)
                .pipe(this.flags.sourceMap ? sourcemaps.write('.', cssMapOptions) : through2.obj())
                .pipe(To.BuildLog('CSS build'))
                .pipe(this.output(this.settings.outputCssFolder));
        });
        this.tasks.task('css', () => {
            fse.removeSync(this.settings.outputCssSourceMap);
            let run = this.tasks.task('css:compile');
            run(error => { });
            if (this.flags.watch) {
                chokidar.watch(this.settings.scssGlob).on('change', path => {
                    run(error => { });
                });
            }
        });
    }
    get needPackageRestore() {
        let hasNodeModules = fse.existsSync(this.settings.npmFolder);
        let hasPackageJson = fse.existsSync(this.settings.packageJson);
        let restore = hasPackageJson && !hasNodeModules;
        if (restore) {
            GulpLog_1.default(chalk_1.default.cyan('node_modules'), 'folder not found. Performing automatic package restore...');
        }
        return restore;
    }
    resolveAsPromise(path) {
        return new Promise((ok, reject) => {
            resolve(path, {
                basedir: this.settings.root
            }, (error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    ok(result);
                }
            });
        });
    }
    resolveThenConcat(paths) {
        return __awaiter(this, void 0, void 0, function* () {
            let concat = '';
            for (let path of paths) {
                let absolute = yield this.resolveAsPromise(path);
                concat += (yield fse.readFile(absolute, 'utf8')) + '\n';
            }
            return concat;
        });
    }
    streamConcatVinyl() {
        let c = this.settings.concatCount;
        let g = through2.obj();
        let resolution = this.settings.concat;
        let countDown = () => {
            c--;
            if (c === 0) {
                g.push(null);
            }
        };
        for (let target in resolution) {
            let ar = resolution[target];
            if (!ar || ar.length === 0) {
                GulpLog_1.default(chalk_1.default.red('WARNING'), 'concat list for', chalk_1.default.blue(target), 'is empty!');
                countDown();
                continue;
            }
            if (typeof ar === 'string') {
                ar = [ar];
                GulpLog_1.default(chalk_1.default.red('WARNING'), 'concat list for', chalk_1.default.blue(target), 'is a', chalk_1.default.yellow('string'), 'instead of a', chalk_1.default.yellow('string[]'));
            }
            this.resolveThenConcat(ar).then(result => {
                let o = target;
                if (o.endsWith('.js') === false) {
                    o += '.js';
                }
                g.push(new vinyl({
                    path: o,
                    contents: Buffer.from(result)
                }));
            }).catch(error => {
                GulpLog_1.default(chalk_1.default.red('ERROR'), 'when concatenating', chalk_1.default.blue(target));
                console.error(error);
            }).then(countDown);
        }
        return g;
    }
    registerConcatTask() {
        let c = this.settings.concatCount;
        if (c === 0) {
            this.tasks.task('concat', () => { });
            return;
        }
        this.tasks.task('concat', () => {
            if (this.flags.watch) {
                GulpLog_1.default("Concat task will be run once and", chalk_1.default.red("NOT watched!"));
            }
            GulpLog_1.default('Resolving', chalk_1.default.cyan(c.toString()), 'concat target(s)...');
            return this.streamConcatVinyl()
                .pipe(this.flags.production ? To.Uglify() : through2.obj())
                .on('error', PipeErrorHandler_1.default)
                .pipe(To.BuildLog('JS concat'))
                .pipe(this.output(this.settings.outputJsFolder));
        });
    }
}
exports.Compiler = Compiler;
