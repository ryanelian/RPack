// Core task runner dependencies
import * as gulp from 'gulp';
import * as gutil from 'gulp-util';
import * as sourcemaps from 'gulp-sourcemaps';

// These are used by concat task
import * as through2 from 'through2';
import * as vinyl from 'vinyl';
import * as resolve from 'resolve';
import * as fs from 'fs-extra';

// These are used by Browserify
import * as browserify from 'browserify';
import * as tsify from 'tsify';
import * as watchify from 'watchify';
import { Templatify } from './Templatify';

// These are used by CSS
import * as gwatch from 'gulp-watch';

// These are my pipes :V
import * as To from './PipeTo';

import { Server } from './Server';
import { Settings, ConcatenationLookup } from './Settings';

/**
 * Defines build flags to be used by Compiler class.
 */
export type CompilerFlags = {
    productionMode: boolean,
    watchMode: boolean,
    serverPort: number
};

/**
 * Contains methods for assembling and invoking the compilation tasks.
 */
export class Compiler {

    /**
     * Gets the project environment settings.
     */
    readonly settings: Settings;

    /**
     * Gets the minification setting for build output.
     */
    readonly productionMode: boolean;

    /**
     * Gets the automatic build setting.
     */
    readonly watchMode: boolean;

    /**
     * Gets the build server instance.
     */
    readonly server: Server;

    /**
     * Constructs a new instance of Compiler using specified build flags. 
     * @param settings 
     * @param flags 
     */
    constructor(settings: Settings, flags: CompilerFlags) {
        this.settings = settings;
        this.productionMode = flags.productionMode;
        this.watchMode = flags.watchMode;

        if (flags.serverPort) {
            this.watchMode = true;
            this.server = new Server(flags.serverPort);
        }

        this.chat();
        this.registerAllTasks();
    }

    /**
     * Displays information about currently used build flags.
     */
    chat() {
        if (this.server) {
            gutil.log(gutil.colors.yellow("Server"), "mode: Listening on", gutil.colors.cyan('http://localhost:' + this.server.port));
        } else {
            gutil.log('Using output folder', gutil.colors.cyan(this.settings.outputFolder));
        }

        if (this.productionMode) {
            gutil.log(gutil.colors.yellow("Production"), "mode: Outputs will be minified.", gutil.colors.red("This process will slow down your build."));
        } else {
            gutil.log(gutil.colors.yellow("Development"), "mode: Outputs are", gutil.colors.red("NOT minified"), "in exchange for compilation speed.");
            gutil.log("Do not forget to minify before pushing to repository or production environment!");
        }

        if (this.watchMode) {
            gutil.log(gutil.colors.yellow("Watch"), "mode: Source codes will be automatically compiled on changes.");
        } else {
            gutil.log("Use", gutil.colors.yellow("--watch"), "flag for switching to", gutil.colors.yellow("Watch"), "mode for automatic compilation on source changes.");
        }
    }

    /**
     * Registers all available tasks and registers a task for invoking all those tasks.
     */
    registerAllTasks() {
        gulp.task('all', ['concat', 'js', 'css']);
        this.registerConcatTask();
        this.registerJsTask();
        this.registerCssTask();
    }

    /**
     * Runs the selected build task.
     * @param taskName 
     */
    build(taskName) {
        gulp.start(taskName);
    }

    /**
     * Flattens abyssmal sourcemap paths resulting from Browserify compilation.
     */
    unfuckBrowserifySourcePaths = (sourcePath: string, file) => {
        let folder = this.settings.input + '/js/';

        if (sourcePath.startsWith('node_modules')) {
            return '../' + sourcePath;
        } else if (sourcePath.startsWith(folder)) {
            return sourcePath.substring(folder.length);
        } else {
            return sourcePath;
        }
    }

    /**
     * Hides a phantom sourcemap resulting from PostCSS compilation into a folder.
     */
    unfuckPostCssSourcePath = (sourcePath: string, file) => {
        if (sourcePath === 'site.css') {
            // TODO: Find a way to destroy this source map completely...
            return "__PostCSS/site.css";
        }
        return sourcePath;
    }

    /**
     * Registers a JavaScript compilation task using TypeScript piped into Browserify.
     */
    registerJsTask() {
        let jsEntry = this.settings.jsEntry;

        if (!fs.existsSync(jsEntry)) {
            gutil.log('JS entry', gutil.colors.cyan(jsEntry), 'was not found.', gutil.colors.red('Aborting JS build.'));
            gulp.task('js', () => { });
            return;
        }

        let browserifyOptions: browserify.Options = {
            debug: true
        };

        if (this.watchMode) {
            browserifyOptions.cache = {};
            browserifyOptions.packageCache = {};
        }

        let bundler = browserify(browserifyOptions).transform(Templatify).add(jsEntry).plugin(tsify);

        let compileJs = () => {
            gutil.log('Compiling JS', gutil.colors.cyan(jsEntry));

            return bundler.bundle()
                .on('error', function (this: any, error) {
                    gutil.log(error);
                    this.emit('end');
                })
                .pipe(To.Vinyl('bundle.js'))
                .pipe(To.VinylBuffer())
                .pipe(To.ErrorHandler())
                .pipe(sourcemaps.init({ loadMaps: true }))
                .pipe(To.MinifyProductionJs(this.productionMode))
                .pipe(sourcemaps.mapSources(this.unfuckBrowserifySourcePaths))
                .pipe(sourcemaps.write('./'))
                .pipe(To.BuildLog('JS compilation'))
                .pipe(this.server ? this.server.Update() : gulp.dest(this.settings.outputJsFolder));
        };

        if (this.watchMode) {
            bundler.plugin(watchify);
            bundler.on('update', compileJs);
        }

        gulp.task('js', compileJs);
    }

    /**
     * Registers a CSS compilation task using Sass piped into postcss.
     */
    registerCssTask() {
        let npm = this.settings.npmFolder;
        let cssEntry = this.settings.cssEntry;
        let sassGlob = this.settings.cssWatchGlob;
        let projectFolder = this.settings.root;

        if (!fs.existsSync(cssEntry)) {
            gutil.log('CSS entry', gutil.colors.cyan(cssEntry), 'was not found.', gutil.colors.red('Aborting CSS build.'));
            gulp.task('css', () => { });
            return;
        }

        gulp.task('css:compile', () => {
            gutil.log('Compiling CSS', gutil.colors.cyan(cssEntry));
            let sassImports = [this.settings.npmFolder];

            return gulp.src(cssEntry)
                .pipe(To.ErrorHandler())
                .pipe(sourcemaps.init())
                .pipe(To.Sass(sassImports))
                .pipe(To.CssProcessors(this.productionMode))
                .pipe(sourcemaps.mapSources(this.unfuckPostCssSourcePath))
                .pipe(sourcemaps.write('./'))
                .pipe(To.BuildLog('CSS compilation'))
                .pipe(this.server ? this.server.Update() : gulp.dest(this.settings.outputCssFolder));
        });

        let watchCallback = undefined;
        if (this.watchMode) {
            watchCallback = () => {
                return gwatch(sassGlob, () => {
                    gulp.start('css:compile');
                });
            };
        }

        gulp.task('css', ['css:compile'], watchCallback);
    }

    /**
     * Returns true when package.json exists in project root folder but node_modules folder is missing.
     */
    needPackageRestore() {
        let hasNodeModules = fs.existsSync(this.settings.npmFolder);
        let hasPackageJson = fs.existsSync(this.settings.packageJson);

        let restore = hasPackageJson && !hasNodeModules;

        if (restore) {
            gutil.log(gutil.colors.cyan('node_modules'), 'folder not found. Performing automatic package restore...');
        }

        return restore;
    }

    /**
     * Attempts to resolve a module using node resolution logic, relative to project folder path, asynchronously.
     * @param path 
     */
    resolveAsPromise(path: string) {
        return new Promise<string>((ok, reject) => {
            resolve(path, {
                basedir: this.settings.root
            }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    ok(result);
                }
            });
        });
    }

    /**
     * Returns a promise for a concatenated file content as string, resulting from a list of node modules.
     * @param paths 
     */
    async resolveThenConcatenate(paths: string[]) {
        let concat = '';

        for (let path of paths) {
            let absolute = await this.resolveAsPromise(path);
            concat += await fs.readFile(absolute, 'utf8') + '\n';
        }

        return concat;
    }

    /**
     * Registers a JavaScript concatenation task.
     */
    registerConcatTask() {
        let concatCount = this.settings.concatCount;
        gutil.log('Resolving', gutil.colors.cyan(concatCount.toString()), 'concatenation targets...');

        if (concatCount === 0) {
            gulp.task('concat', undefined);
            return;
        }

        if (this.watchMode) {
            gutil.log("Concatenation task will be run once and", gutil.colors.red("NOT watched!"));
        }

        gulp.task('concat', () => {
            let g = through2.obj();
            let resolution = this.settings.concat;

            for (let target in resolution) {
                this.resolveThenConcatenate(resolution[target]).then(result => {
                    g.push(new vinyl({
                        path: target + '.js',
                        contents: Buffer.from(result)
                    }));

                    concatCount--;
                    if (concatCount === 0){
                        g.push(null);
                    }
                });
            }

            return g.pipe(To.MinifyProductionJs(this.productionMode))
                .pipe(To.BuildLog('JS concatenation'))
                .pipe(this.server ? this.server.Update() : gulp.dest(this.settings.outputJsFolder));
        });
    }
}
