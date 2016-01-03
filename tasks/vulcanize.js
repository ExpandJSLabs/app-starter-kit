(function () {
    'use strict';

    var $ = require('gulp-load-plugins')(),
        gulp = require('gulp');

    module.exports = function() {
        return gulp.src('app/elements/elements.html')
            .pipe($.vulcanize({
                stripComments: true,
                inlineCss: true,
                inlineScripts: true
            }))
            .pipe($.crisper())
            .pipe(gulp.dest('dist/elements'))
            .pipe($.size({title: 'vulcanize'}));
    };

}());
