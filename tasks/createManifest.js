(function () {
    'use strict';

    var gulp = require('gulp'),
        fs   = require('fs'),
        $    = require('gulp-load-plugins')(),
        FAVICON_DATA_FILE = 'dist/manifest/faviconData.json';

    module.exports = function (cb) {
        $.realFavicon.generateFavicon({
            masterPicture: 'app/images/manifest-icon.png',
            dest: 'dist/manifest',
            iconsPath: '/manifest',
            design: {
                ios: {
                    pictureAspect: 'backgroundAndMargin',
                    backgroundColor: '#ffffff',
                    margin: '18%'
                },
                desktopBrowser: {},
                windows: {
                    pictureAspect: 'noChange',
                    backgroundColor: '#da532c',
                    onConflict: 'override'
                },
                androidChrome: {
                    pictureAspect: 'noChange',
                    themeColor: '#f15a29',
                    manifest: {
                        name: 'ExpandJS',
                        display: 'browser',
                        orientation: 'notSet',
                        onConflict: 'override'
                    }
                },
                safariPinnedTab: {
                    pictureAspect: 'silhouette',
                    themeColor: '#f15a29'
                }
            },
            settings: {
                compression: 5,
                scalingAlgorithm: 'Mitchell',
                errorOnImageTooSmall: false
            },
            markupFile: FAVICON_DATA_FILE
        }, function() {

            gulp.src('dist/index.html')
                .pipe($.realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code))
                .pipe(gulp.dest('dist'));

            // FAVICON should be in index
            gulp.src('dist/manifest/favicon.ico').pipe(gulp.dest('dist'));

            cb();
        });
    };

}());
