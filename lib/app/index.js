const express = require('express');
const cheerio = require('cheerio');
const path    = require('path');
const fs      = require('fs');

function readView(path) {
    return new Promise(resolve => {
        try {
            let data = fs.readFileSync(path);
            resolve(data || null);
        } catch (e) {
            resolve(null);
        }
    });
}

module.exports = function (sys) {
    const app       = express.Router();
    const viewsPath = path.resolve(__dirname, 'ui', 'views');

    app.use(express.static(path.resolve(__dirname, 'static')));
    app.use('/partials', express.static(path.resolve(__dirname, 'views', 'partials')));

    app.get('/_routes', (req, res) => res.sendFile(path.resolve(__dirname, 'routes.json')));

    app.get('/views', async (req, res) => {
        const view = null || // This is purely for formatting. It looks better like this :3
            await readView(path.join(viewsPath, req.query['view'])) ||
            await readView(path.join(viewsPath, req.query['view'] + '.html')) ||
            await readView(path.join(viewsPath, req.query['view'], 'index.html'));

        if (view) res.status(200).set('content-type', 'text/html').send(view);
        else res.status(404).send('Not Found');
    });

    app.use(async (req, res) => {
        let routes = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'routes.json')));
        routes.forEach(route => route.route = new RegExp(`^${route.route}(\\?.*)?(\\#.*)?$`));

        let route = routes.find(route => !!route.route.test(req.originalUrl));
        if (route) {
            let view     = route.view;
            let mainHtml = fs.readFileSync(path.join(__dirname, 'ui', 'index.html'));
            let viewHtml = null ||
                await readView(path.join(viewsPath, view)) ||
                await readView(path.join(viewsPath, view + '.html')) ||
                await readView(path.join(viewsPath, view, 'index.html'));

            let $ = cheerio.load(mainHtml);

            $('#view').html(viewHtml);

            let finalHtml = $.html();

            res.set('content-type', 'text/html').send(finalHtml);
        }
        else
            res.status(400).send('Not Found');
    });

    return app;
};