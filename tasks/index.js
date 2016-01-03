(function () {
    'use strict';

    // Vars
    var fs = require('xp-fs');

    /*********************************************************************/

    // Exporting
    module.exports = fs.exportSync(__dirname);

}());
