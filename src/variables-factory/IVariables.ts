/**
 * Contains all flags and settings for the instapack build tool.
 */
export interface IVariables {

    /**
     * Gets the project root folder path.
     */
    root: string;

    /**
     * Gets the project source input folder name.
     */
    input: string;

    /**
     * Gets the project assets output folder name.
     */
    output: string;

    /**
     * Gets the JS output file name.
     */
    jsOut: string;

    /**
     * Gets the CSS output file name.
     */
    cssOut: string;

    /**
     * Replaces dependency imports to another dependency. For example: {'vue': 'vue/dist/vue.esm'}
     */
    alias: IMapLike<string>;

    /**
     * Rewrites dependency imports to a global object. For example: {'jquery': '$'}
     */
    externals: IMapLike<string>;

    /**
     * Gets the user-supplied environment variables from CLI or .env file.
     */
    env: IMapLike<string>;

    /**
     * Gets the user settings for the package manager used for automatic project restore prior builds. 
     */
    packageManager: 'npm' | 'yarn' | 'disabled';

    /**
     * Gets the user settings for disabling notification on build failure.
     */
    muteNotification: boolean;

    /**
     * Gets the production mode build flag, which enables minification and optimization of the build outputs. 
     */
    production: boolean;

    /**
     * Gets the enable source map build flag, which enables debugging of the bundled outputs.  
     */
    sourceMap: boolean;

    /**
     * Gets the watch mode build flag, which enables incremental compilation of mutated source codes.
     */
    watch: boolean;

    /**
     * Gets the output JS stats build flags, for production build only. 
     */
    stats: boolean;

    /**
     * Gets the verbose build flag.
     */
    verbose: boolean;

    /**
     * Gets the hot reload development mode build flag.
     */
    hot: boolean;

    /**
     * Gets the static port number to be used by the Hot Reload server for delivering built assets.
     */
    port1: number;

    /**
     * Gets the static port number to be used by the Hot Reload server for broadcasting changes using WebSocket.
     */
    port2: number;

    typescriptConfiguration: any;
}
