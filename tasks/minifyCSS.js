(function () {
    'use strict';

    var gulp = require('gulp'),
        $ = require('gulp-load-plugins')();

    module.exports = function () {
        return gulp.src([
                'app/**/*.css',
                '!app/elements/**/*.css'
            ])
            .pipe($.cssnano())
            .pipe(gulp.dest('dist'))
            .pipe($.size({title: 'css'}));
    };

}());
