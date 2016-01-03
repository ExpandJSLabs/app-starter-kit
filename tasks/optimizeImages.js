(function () {
    'use strict';

    var gulp = require('gulp'),
        merge = require('merge-stream'),
        $ = require('gulp-load-plugins')();

    module.exports = function () {
        var app, manifest;

        app = gulp.src('app/images/**/*')
            .pipe($.imagemin({
                progressive: true,
                interlaced: true
            }))
            .pipe(gulp.dest('dist/images'));

        manifest = gulp.src('dist/manifest/**/*')
            .pipe($.imagemin({
                progressive: true,
                interlaced: true
            }))
            .pipe(gulp.dest('dist/manifest'));

        return merge(app, manifest).pipe($.size({title: 'images'}));
    };

}());
