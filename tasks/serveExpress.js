(function () {
    'use strict';

    var $ = require('gulp-load-plugins')();

    module.exports = function (cb) {
        var server = $.liveServer('server.js', undefined, false);
        server.start();
        cb();
    };

}());
