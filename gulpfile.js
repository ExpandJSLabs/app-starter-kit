(function () {
    'use strict';

    var gulp  = require('gulp'),
        del   = require('del'),
        tasks = require('./tasks'),
        runSequence = require('run-sequence');

    /***********************************************************************/
    /* SERVING */
    /***********************************************************************/

    gulp.task('serve', tasks.serve);
    gulp.task('serve:dist', tasks.serveDist);
    gulp.task('serve:express', tasks.serveExpress);

    /***********************************************************************/
    /* PRE-BUILD */
    /***********************************************************************/

    gulp.task('clean', del.bind(null, ['dist']));
    gulp.task('lint', tasks.lint);
    gulp.task('copy', tasks.copy);
    gulp.task('create-manifest', tasks.createManifest);

    /***********************************************************************/
    /* OPTIMIZATION && MINIFICATION */
    /***********************************************************************/

    gulp.task('minify-html', tasks.minifyHTML);
    gulp.task('minify-css', tasks.minifyCSS);
    gulp.task('minify-js', tasks.minifyCSS);
    gulp.task('optimize-images', tasks.optimizeImages);

    /***********************************************************************/
    /* BUILDING */
    /***********************************************************************/

    gulp.task('vulcanize', tasks.vulcanize);
    gulp.task('build', ['clean'], function () {
        runSequence('lint', 'copy', 'create-manifest',
            'vulcanize', 'minify-html', 'minify-css', 'minify-js', 'optimize-images');
    });

    /***********************************************************************/
    /* DEPLOYING */
    /***********************************************************************/

    gulp.task('deploy:GHPages', tasks.deployGHPages);

    /***********************************************************************/
    /* DEFAULT */
    /***********************************************************************/

    gulp.task('default', ['build'], function (cb) {
        runSequence('serve:dist', cb);
    });

}());
