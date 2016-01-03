(function () {
    'use strict';

    var bs = require('browser-sync').create();

    module.exports = function () {
        bs.init({
            server: {
                baseDir: ['./', 'app']
            },
            files: ['**/**', 'app/**/**'],
            notify: false,
            ghostMode: false,
            logPrefix: 'EJS Starter Kit'
        });
    };

}());
