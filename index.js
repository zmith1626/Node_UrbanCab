"use strict";

require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const expressValidator = require("express-validator");

const responseHeaderConfig = require("./server/responseHeaderConfig");

const serviceAccount = require("./gs_docs.json");
const sslPort = 8080 || process.env.PORT;
const app = express();
responseHeaderConfig(app);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(expressValidator());
app.use(express.static("webpages/public"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const apiRoutesConfig = require("./server/apiRouteConfig");
apiRoutesConfig(app);

app.listen(sslPort, err => {
  if (err) throw err;
  console.log(`Server Listening on port 8080`);
});
