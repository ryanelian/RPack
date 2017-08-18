// Core dependencies
import * as Undertaker from 'undertaker';
import * as vinyl from 'vinyl';
import * as through2 from 'through2';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as resolve from 'resolve';
import * as chalk from 'chalk';
import * as chokidar from 'chokidar';
import * as sourcemaps from 'gulp-sourcemaps';

// These are my stuffs
import glog from './GulpLog';
import PipeErrorHandler from './PipeErrorHandler';
import * as To from './PipeTo';
import { Server } from './Server';
import { Settings, ConcatenationLookup } from './Settings';

// These are used by Browserify
import * as browserify from 'browserify';
import * as tsify from 'tsify';
import * as watchify from 'watchify';
import templatify from './Templatify';

/**
 * Defines build flags to be used by Compiler class.
 */
export interface CompilerFlags {
    minify: boolean,
    watch: boolean,
    map: boolean,
    serverPort: number
}

/**
 * Contains methods for assembling and invoking the compilation tasks.
 */
export class Compiler {

    /**
     * Gets the project environment settings.
     */
    readonly settings: Settings;

    /**
     * Gets the compiler build flags.
     */
    readonly flags: CompilerFlags;

    /**
     * Gets the build server instance.
     */
    readonly server: Server;

    /**
     * Gets the task registry.
     */
    readonly tasks: Undertaker;

    /**
     * Constructs a new instance of Compiler using specified build flags. 
     * @param settings 
     * @param flags 
     */
    constructor(settings: Settings, flags: CompilerFlags) {
        this.settings = settings;
        this.flags = flags;
        this.tasks = new Undertaker();

        if (flags.serverPort) {
            this.flags.watch = true;
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
            glog(chalk.yellow("Server"), "mode: Listening on", chalk.cyan('http://localhost:' + this.server.port));
        } else {
            glog('Using output folder', chalk.cyan(this.settings.outputFolder));
        }

        if (this.flags.minify) {
            glog(chalk.yellow("Production"), "mode: Outputs will be minified.", chalk.red("This process will slow down your build!"));
        } else {
            glog(chalk.yellow("Development"), "mode: Outputs are", chalk.red("NOT minified"), "in exchange for compilation speed.");
            glog("Do not forget to minify before pushing to repository or production environment!");
        }

        if (this.flags.watch) {
            glog(chalk.yellow("Watch"), "mode: Source codes will be automatically compiled on changes.");
        }

        if (!this.flags.map) {
            glog(chalk.yellow("Unmap"), "mode: Source maps disabled.");
        }
    }

    /**
     * Creates a pipe that redirects file to output folder or a server.
     * @param folder 
     */
    output(folder: string) {
        return through2.obj(async (file: vinyl, encoding, next) => {
            if (file.isStream()) {
                let error = new Error('instapack output: Streaming is not supported!');
                return next(error);
            }

            if (file.isBuffer()) {
                if (this.server) {
                    await this.server.Update(file.relative, file.contents);
                } else {
                    let p = path.join(folder, file.relative);
                    await fse.outputFile(p, file.contents);
                }
            }

            next(null, file);
        });
    }

    /**
     * Registers all available tasks and registers a task for invoking all those tasks.
     */
    registerAllTasks() {
        this.registerConcatTask();
        this.registerJsTask();
        this.registerCssTask();
        this.tasks.task('all', this.tasks.parallel('concat', 'js', 'css'));
    }

    /**
     * Runs the selected build task.
     * @param taskName 
     */
    build(taskName) {
        let run = this.tasks.task(taskName);
        run(error => { });
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
     * Registers a JavaScript compilation task using TypeScript piped into Browserify.
     */
    registerJsTask() {
        let jsEntry = this.settings.jsEntry;

        if (!fse.existsSync(jsEntry)) {
            this.tasks.task('js', () => {
                glog('JS entry', chalk.cyan(jsEntry), 'was not found.', chalk.red('Aborting JS build.'));
            });
            return;
        }

        let browserifyOptions: browserify.Options = {
            debug: this.flags.map
        };

        if (this.flags.watch) {
            browserifyOptions.cache = {};
            browserifyOptions.packageCache = {};
        }

        let bundler = browserify(browserifyOptions).transform(templatify, {
            minify: this.flags.minify
        }).add(jsEntry).plugin(tsify);

        let compileJs = () => {
            glog('Compiling JS', chalk.cyan(jsEntry));

            return bundler.bundle()
                .on('error', PipeErrorHandler)
                .pipe(To.Vinyl('bundle.js'))
                .pipe(To.VinylBuffer())
                .pipe(this.flags.map ? sourcemaps.init({ loadMaps: true }) : through2.obj())
                .pipe(this.flags.minify ? To.Uglify() : through2.obj())
                .on('error', PipeErrorHandler)
                .pipe(this.flags.map ? sourcemaps.mapSources(this.unfuckBrowserifySourcePaths) : through2.obj())
                .pipe(this.flags.map ? sourcemaps.write('./') : through2.obj())
                .pipe(To.BuildLog('JS compilation'))
                .pipe(this.output(this.settings.outputJsFolder));
        };

        if (this.flags.watch) {
            bundler.plugin(watchify);
            bundler.on('update', compileJs);
        }

        this.tasks.task('js', compileJs);
    }

    /**
     * Pipes the CSS project entry point as a Vinyl object. 
     */
    getCssEntryVinyl() {
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

    /**
     * Registers a CSS compilation task using Sass piped into postcss.
     */
    registerCssTask() {
        let cssEntry = this.settings.cssEntry;

        if (!fse.existsSync(cssEntry)) {
            this.tasks.task('css', () => {
                glog('CSS entry', chalk.cyan(cssEntry), 'was not found.', chalk.red('Aborting CSS build.'));
            });
            return;
        }

        this.tasks.task('css:compile', () => {
            glog('Compiling CSS', chalk.cyan(cssEntry));
            let sassImports = [this.settings.npmFolder];

            return this.getCssEntryVinyl()
                .pipe(this.flags.map ? sourcemaps.init() : through2.obj())
                .pipe(To.Sass(sassImports))
                .on('error', PipeErrorHandler)
                .pipe(To.CssProcessors())
                .on('error', PipeErrorHandler)
                .pipe(this.flags.map ? sourcemaps.write('./') : through2.obj())
                .pipe(To.BuildLog('CSS compilation'))
                .pipe(this.output(this.settings.outputCssFolder));
        });

        this.tasks.task('css', () => {
            let run = this.tasks.task('css:compile');
            run(error => { });

            if (this.flags.watch) {
                chokidar.watch(this.settings.scssGlob).on('change', path => {
                    run(error => { });
                });
            }
        });
    }

    /**
     * Returns true when package.json exists in project root folder but node_modules folder is missing.
     */
    needPackageRestore() {
        let hasNodeModules = fse.existsSync(this.settings.npmFolder);
        let hasPackageJson = fse.existsSync(this.settings.packageJson);

        let restore = hasPackageJson && !hasNodeModules;

        if (restore) {
            glog(chalk.cyan('node_modules'), 'folder not found. Performing automatic package restore...');
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
            concat += await fse.readFile(absolute, 'utf8') + '\n';
        }

        return concat;
    }

    /**
     * Registers a JavaScript concatenation task.
     */
    registerConcatTask() {
        let concatCount = this.settings.concatCount;
        glog('Resolving', chalk.cyan(concatCount.toString()), 'concatenation targets...');

        if (concatCount === 0) {
            this.tasks.task('concat', () => { });
            return;
        }

        if (this.flags.watch) {
            glog("Concatenation task will be run once and", chalk.red("NOT watched!"));
        }

        this.tasks.task('concat', () => {
            let g = through2.obj();
            let resolution = this.settings.concat;

            for (let target in resolution) {
                this.resolveThenConcatenate(resolution[target]).then(result => {
                    g.push(new vinyl({
                        path: target + '.js',
                        contents: Buffer.from(result)
                    }));

                    concatCount--;
                    if (concatCount === 0) {
                        g.push(null);
                    }
                });
            }

            return g.pipe(this.flags.minify ? To.Uglify() : through2.obj())
                .on('error', PipeErrorHandler)
                .pipe(To.BuildLog('JS concatenation'))
                .pipe(this.output(this.settings.outputJsFolder));
        });
    }
}
