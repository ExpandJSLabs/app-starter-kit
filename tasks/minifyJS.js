(function () {
    'use strict';

    var gulp = require('gulp'),
        $ = require('gulp-load-plugins')();

    module.exports = function () {
        return gulp.src([
                'app/**/*.js',
                '!app/elements/**/*.js'
            ])
            .pipe($.uglify({preserveComments: 'some'}))
            .pipe(gulp.dest('dist'))
            .pipe($.size({title: 'js'}));
    };

}());
