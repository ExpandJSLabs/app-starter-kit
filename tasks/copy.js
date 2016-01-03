(function () {
    'use strict';

    var $ = require('gulp-load-plugins')(),
        gulp = require('gulp'),
        merge = require('merge-stream');

    module.exports = function () {
        var app, bower;

        // Only copy what won't be vulcanized
        app = gulp.src([
            'app/*',
            '!app/elements',
            '!app/tests',
            '!**/.DS_Store'
        ], {
            dot: true
        }).pipe(gulp.dest('dist'));

        bower = gulp.src([
            'bower_components/webcomponentsjs/**/***/*'
        ]).pipe(gulp.dest('dist/bower_components'));

        return merge(app, bower).pipe($.size({title: 'copy'}));
    };

}());
