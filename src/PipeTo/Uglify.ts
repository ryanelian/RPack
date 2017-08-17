import * as UglifyJS from 'uglify-js';
import * as through2 from 'through2';
import * as applySourceMap from 'vinyl-sourcemaps-apply';

/**
 * Creates a new build pipe that minifies JavaScript output.
 * @param productionMode 
 */
export function Uglify() {
    return through2.obj(function (chunk, enc, next) {
        if (chunk.isNull()) {
            return next(null, chunk);
        }
        
        if (chunk.isStream()) {
            let error = new Error('Uglify: Streaming is not supported!');
            return next(error);
        }

        let options: any = {};
        let createSourceMap = Boolean(chunk.sourceMap);

        if (createSourceMap) {
            options.sourceMap = {
                filename: chunk.sourceMap.file,
                content: chunk.sourceMap,
                includeSources: true
            };
        }

        let files: any = {};
        files[chunk.relative] = chunk.contents.toString();

        let result: any = UglifyJS.minify(files, options);

        if (result.error) {
            next(result.error);
        }

        chunk.contents = Buffer.from(result.code);

        if (createSourceMap) {
            applySourceMap(chunk, JSON.parse(result.map));
        }

        next(null, chunk);
    });
}
