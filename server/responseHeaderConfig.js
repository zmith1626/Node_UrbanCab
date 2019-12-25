"use strict";

const helmet = require('helmet');
const appSettings = require('../constants/settings');

var responseHeaderConfig = (app) => {
    app.use(helmet.hsts({
        maxAge: 1000 * 60 * 60 * 24 * 365,
        includeSubDomains: true,
        preload: true
    }));
    app.use(helmet.permittedCrossDomainPolicies());
    app.use(helmet.dnsPrefetchControl());
    app.use(helmet.frameguard({ action: 'sameorigin' }));
    app.use(helmet.hidePoweredBy());
    app.use(helmet.ieNoOpen());
    app.use(helmet.noCache());
    app.use(helmet.noSniff());
    app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
    app.use(helmet.xssFilter());
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'", "https"],
            scriptSrc: ["'self'", "'unsafe-inline'", appSettings.semanticjs, appSettings.fireApp, appSettings.fireAuth, appSettings.fireData],
            styleSrc: ["'self'", "'unsafe-inline'", appSettings.googleStyle, appSettings.semanticStyle],
            imgSrc: ["'self'", "https://images.unsplash.com/photo-1494253109108-2e30c049369b", "data:;"],
            fontSrc: ["'self'", "https:", appSettings.googleFonts, appSettings.semanticWoff, appSettings.semanticWoff2, appSettings.semanticTtf, "data:;"],
            connectSrc: ["'self'", appSettings.fireConnect, appSettings.fireAccnt, appSettings.fireChange],
            reportUri: "/cspviolation"
        },
    }));
};

module.exports = responseHeaderConfig;