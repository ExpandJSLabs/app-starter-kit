(function () {
    'use strict';

    var gulp = require('gulp'),
        $ = require('gulp-load-plugins')();

    module.exports = function() {
        return gulp.src('dist/**/*').pipe($.ghPages());
    };

}());
