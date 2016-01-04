(function () {
    'use strict';

    var gulp = require('gulp'),
        fs   = require('fs'),
        path = require('path'),
        crypto = require('crypto'),
        glob = require('glob-all'),
        packageJson = require('../package.json');

    module.exports = function(callback) {
        var dir = 'dist',
            md5 = crypto.createHash('md5'),
            configPath = path.join(dir, 'cache-config.json'),
            config = {
                cacheId: packageJson.name || path.basename(__dirname),
                disabled: false
            };

        glob([
            'index.html',
            './',
            'bower_components/webcomponentsjs/webcomponents-lite.min.js',
            '{elements,scripts,styles}/**/*.*'],
        {cwd: dir}, function(error, files) {
            if (error) {
                callback(error);
            } else {
                config.precache = files;

                md5.update(JSON.stringify(config.precache));
                config.precacheFingerprint = md5.digest('hex');

                fs.writeFile(configPath, JSON.stringify(config), callback);
            }
        });
    };

}());
