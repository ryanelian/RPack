import * as sass from 'node-sass';
import * as through2 from 'through2';
import * as path from 'path';
import * as applySourceMap from 'vinyl-sourcemaps-apply';

/**
 * Creates a new build pipe that performs compilation against piped Sass file entry point.
 * Allows including folder path for resolving @import.
 * @param includePaths 
 */
export function Sass(includePaths: string[]) {
    return through2.obj(function (chunk, enc, next) {
        if (chunk.isNull()) {
            return next(null, chunk);
        }

        if (chunk.isStream()) {
            let error = new Error('Sass: Streaming is not supported!');
            return next(error);
        }

        // outputStyle "compressed" on Sass options + cssnano discardComments eliminated the PostCSS phantom source map. BUT HOW?!?
        let options: sass.Options = {
            outputStyle: 'compressed'
        };
        let createSourceMap = Boolean(chunk.sourceMap);

        options.data = chunk.contents.toString();
        options.file = chunk.path;
        options.includePaths = includePaths;

        if (createSourceMap) {
            options.sourceMap = chunk.path;
            options.omitSourceMapUrl = true;
            options.sourceMapContents = true;
        }

        sass.render(options, (error, result) => {
            if (error) {
                next(error);
                return;
            }

            if (createSourceMap) {
                let smap = JSON.parse(result.map.toString()) as sourceMap.RawSourceMap;
                applySourceMap(chunk, smap);
            }

            let newPath = path.join(path.dirname(chunk.path), 'ipack.css');
            // E:\VS\TAM.Passport\TAM.Passport\client\css\site.scss --> E:\VS\TAM.Passport\TAM.Passport\client\css\ipack.css

            chunk.contents = result.css;
            chunk.path = newPath;

            next(null, chunk);
        });
    });
}
