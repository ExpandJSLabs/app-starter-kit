(function () {
    'use strict';

    var gulp = require('gulp'),
        $ = require('gulp-load-plugins')();

    module.exports = function () {
        return gulp.src([
                'app/**/*.html',
                '!app/index.html',
                '!app/elements/**/*.html',
                'dist/index.html'
            ])
            .pipe($.htmlMinifier({
                removeComments: true,
                collapseWhitespace: true,
                minifyCSS: true,
                minifyJS: true
            }))
            .pipe(gulp.dest('dist'))
            .pipe($.size({title: 'html'}));
    };

}());
