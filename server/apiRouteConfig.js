"use strict";

const cors = require("cors");
const mainRoute = require("../routes/mainrouter");
const userRoute = require("../routes/userrouter");
const verifyRoute = require("../routes/verifyroute");
const ticketRoute = require("../routes/ticketrouter");
const timelineRoute = require("../routes/timelinerouter");
const privateBookRoute = require("../routes/privatebookingrouter");

var configApiRoutes = function(app) {
  app.use(cors());
  app.use(
    mainRoute,
    ticketRoute,
    timelineRoute,
    privateBookRoute,
    userRoute,
    verifyRoute
  );
};

module.exports = configApiRoutes;
