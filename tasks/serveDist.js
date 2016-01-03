(function () {
    'use strict';

    var bs = require('browser-sync').create();

    module.exports = function () {
        bs.init({
            server: {
                baseDir: ['dist']
            },
            notify: false,
            ghostMode: false,
            logPrefix: 'EJS Starter Kit'
        });
    };

}());
