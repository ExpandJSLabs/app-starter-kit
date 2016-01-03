(function () {
    'use strict';

    var gulp = require('gulp'),
        argv = require('yargs').argv,
        $    = require('gulp-load-plugins')();

    module.exports = function() {
        return gulp.src([
                'app/*.html',
                'app/elements/**/*.js',
                'app/elements/**/*.html',
                'app/scripts/**/*.js',
                'tasks/*.js',
                'gulpfile.js',
                'server.js'
            ])
            // Extract javascript from html files
            .pipe($.if('*.html', $.htmlExtract({sel: 'script:not([type="text/html"])', strip: true})))
            .pipe($.jshint())
            .pipe($.jscs())
            .pipe($.jscsStylish.combineWithHintResults())
            // Use explicit reporter if `--verbose` or `--v` are passed as arguments
            .pipe($.if(argv.verbose || argv.v, $.jscs.reporter(), $.jshint.reporter('jshint-stylish')));
    };

}());
