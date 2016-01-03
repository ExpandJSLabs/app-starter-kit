(function () {
    'use strict';

    var ghPages = require('gh-pages');

    module.exports = function(cb) {
        ghPages.publish(__dirname + '/../dist', cb);
    };

}());
