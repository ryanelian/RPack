import * as TypeScript from 'typescript';
import chalk from 'chalk';
import * as fse from 'fs-extra';
import * as upath from 'upath';
import * as chokidar from 'chokidar';

import { Settings } from './Settings';
import { prettyHrTime } from './PrettyUnits';
import { Shout } from './Shout';
import { VirtualSourceStore } from './VirtualSourceStore';

/**
 * Contains methods for static-checking TypeScript projects. 
 */
export class TypeScriptCheckerTool {

    /**
     * Gets the instapack Settings object.
     */
    private readonly settings: Settings;

    /**
     * Gets the shared TypeScript compiler options.
     */
    private compilerOptions: TypeScript.CompilerOptions;

    /**
     * Gets the shared TypeScript compiler host.
     */
    private host: TypeScript.CompilerHost;

    /**
     * Gets the TypeScript cache management object.
     */
    private virtualSourceStore: VirtualSourceStore;

    /**
     * Constructs a new instance of TypeScriptCheckerTool using provided instapack Settings.
     * @param settings 
     */
    constructor(settings: Settings) {
        this.settings = settings;
    }

    /**
     * Use project tsconfig.json to setup TypeScript Compiler Host with in-memory caching mechanism.
     */
    async setupCompilerHost() {
        let tsconfig = await this.settings.readTsConfig();
        this.compilerOptions = tsconfig.options;

        this.virtualSourceStore = new VirtualSourceStore(this.compilerOptions);
        let definitions = tsconfig.fileNames.filter(Q => Q.endsWith('.d.ts'));
        this.virtualSourceStore.includeFile(this.settings.jsEntry);
        this.virtualSourceStore.includeFiles(definitions);

        this.host = TypeScript.createCompilerHost(tsconfig.options);

        let rawFileCache: IMapLike<string> = {};
        this.host.readFile = (fileName) => {
            // Apparently this is being used by TypeScript to read package.json in node_modules...
            // Probably to find .d.ts files?

            if (rawFileCache[fileName]) {
                // console.log('READ (cache) ' + fileName);
                return rawFileCache[fileName];
            }

            // package.json in node_modules should never change. Cache the contents once and re-use.
            // console.log('READ ' + fileName);

            let fileContent = fse.readFileSync(fileName, 'utf8');
            rawFileCache[fileName] = fileContent;
            return fileContent;
        }

        this.host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
            return this.virtualSourceStore.getSource(fileName);
        }

        // How to add new file format / extension:
        // 1. add exotic source glob (and watch)
        // 2. add logic to parseThenStoreSource
        // 3. add check to delete virtual file path condition
        await this.virtualSourceStore.addExoticSources(this.settings.vueGlobs);
        await this.virtualSourceStore.preloadSources();
    }

    /**
     * Performs full static check (semantic and syntactic diagnostics) against the TypeScript application project.
     */
    async typeCheck() {
        let entryPoints = this.virtualSourceStore.entryFilePaths;
        // console.log(entryPoints);
        let tsc = TypeScript.createProgram(entryPoints, this.compilerOptions, this.host);

        Shout.timed('Type-checking using TypeScript', chalk.yellow(TypeScript.version));
        let start = process.hrtime();

        try {
            let errors: string[] = [];
            for (let source of tsc.getSourceFiles()) {
                if (source.fileName.endsWith('.d.ts')) {
                    continue;
                }

                let diagnostics = tsc.getSemanticDiagnostics(source)
                    .concat(tsc.getSyntacticDiagnostics(source));

                let newErrors = this.renderDiagnostics(diagnostics);
                for (let error of newErrors) {
                    errors.push(error);
                }
            }
            if (!errors.length) {
                console.log(chalk.green('Types OK') + chalk.grey(': Successfully checked TypeScript project without errors.'));
            } else {
                if (errors.length === 1) {
                    Shout.notify(`You have one TypeScript check error!`);
                } else {
                    Shout.notify(`You have ${errors.length} TypeScript check errors!`);
                }

                let errorsOut = '\n' + errors.join('\n\n') + '\n';
                console.error(errorsOut);
            }
        } finally {
            let time = prettyHrTime(process.hrtime(start));
            Shout.timed('Finished type-checking after', chalk.green(time));
        }
    }

    /**
     * Converts a collection of TypeScript Diagnostic objects to an array of colorful strings.
     * @param diagnostics 
     */
    renderDiagnostics(diagnostics: TypeScript.Diagnostic[]) {
        let errors = diagnostics.map(diagnostic => {
            let error = chalk.red('TS' + diagnostic.code) + ' ';

            if (diagnostic.file) {
                let realFileName = this.virtualSourceStore.getRealFilePath(diagnostic.file.fileName);
                let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                error += chalk.red(realFileName) + ' ' + chalk.yellow(`(${line + 1},${character + 1})`) + ':\n';
            }

            error += TypeScript.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            return error;
        });

        return errors;
    }

    /**
     * Tracks all TypeScript files (*.ts and *.tsx) in the project folder recursively.
     * On file creation / change / deletion, the project will be type-checked automatically.
     */
    watch() {
        let debounced: NodeJS.Timer;
        let debounce = () => {
            clearTimeout(debounced);
            debounced = setTimeout(() => {
                this.typeCheck().catch(error => {
                    Shout.fatal('during type-checking!', error);
                });
            }, 300);
        };

        chokidar.watch(this.settings.typeCheckGlobs, {
            ignoreInitial: true
        })
            .on('add', (file: string) => {
                file = upath.toUnix(file);

                this.virtualSourceStore.addOrUpdateSourceAsync(file).then(changed => {
                    Shout.typescript(chalk.grey('tracking new file:', file));
                    debounce();
                });
            })
            .on('change', (file: string) => {
                file = upath.toUnix(file);

                this.virtualSourceStore.addOrUpdateSourceAsync(file).then(changed => {
                    if (changed) {
                        Shout.typescript(chalk.grey('updating file:', file));
                        debounce();
                    }
                });
            })
            .on('unlink', (file: string) => {
                file = upath.toUnix(file);

                let deleted = this.virtualSourceStore.tryRemoveSource(file);
                if (deleted) {
                    Shout.typescript(chalk.grey('removing file:', file));
                    debounce();
                }
            });

        // console.log(Object.keys(this.files));
        // console.log(Object.keys(this.sources));
        // console.log(this.fileVersions);
        // console.log(this.includeFiles);
    }
}
