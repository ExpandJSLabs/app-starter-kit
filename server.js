(function () {
    'use strict';

    var dir     = __dirname,

        ejs     = require('ejs'),
        express = require('express'),
        slash   = require('express-slash'),

        app     = express(),
        port    = process.env.PORT || 3000,
        router  = express.Router({caseSensitive: true, strict: true});

    /***********************************************************************/
    /* APP */
    /***********************************************************************/

    // Settings
    app.set('case sensitive routing', true);
    app.set('strict routing', true);
    app.set('port', port);
    app.set('view engine', 'html');
    app.set('views', dir + '/app');

    // View engine
    app.engine('html', ejs.renderFile);

    // Statics
    app.use(express.static(dir + '/app'));
    app.use('/bower_components', express.static(dir + '/bower_components'));

    // Middleware
    app.use(router);
    app.use(slash());

    /***********************************************************************/
    /* ROUTES */
    /***********************************************************************/

    // Index
    router.get('/', function (req, res) {
        res.render('index');
    });

    // Partials
    router.get('/partial/:name', function (req, res, next) {
        res.render('partial/' + req.params.name, {}, function (error, html) {
            return error ? next() : res.end(html);
        });
    });

    /***********************************************************************/
    /* ERRORS */
    /***********************************************************************/

    app.use(function (req, res) { res.status(404); res.render('404', {url: req.url}); });
    app.use(function (req, res) { res.status(500); res.render('500', {url: req.url}); });

    /***********************************************************************/
    /* LISTENING */
    /***********************************************************************/

    app.listen(port, function () { console.log('App listening on port ' + port); });

}());
