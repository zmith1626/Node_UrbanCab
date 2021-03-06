"use strict";

const express = require("express");
const admin = require("firebase-admin");
const path = require("path");
const jwt = require("jwt-simple");
const nodemailer = require("nodemailer");

const verifyRoute = express.Router();

//Middleware Invocation
const auth = require("../middleware");

//Schemas Invocation
const singleEntitySchema = require("../validator/singleEntityValidationSchema");

async function sendMail(email, encodedToken) {
  var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.ACCOUNT_INFO,
      pass: process.env.ACCOUNT_PWD
    }
  });
  var mailOptions = {
    to: email,
    from: "noreply@ExpangeTech<noreply@ExpangeTech.com>",
    subject: "Email Verification Link",
    text:
      "Please click on the following link to complete the verification process:\n\n" +
      "https://" +
      "ultra-syntax-247615.appspot.com" +
      "/verify/" +
      encodedToken +
      "/user/email" +
      "\n\n" +
      "If you did not request this, please ignore this email.\n\n" +
      "Thanks," +
      "\n" +
      "Expange Tech Pvt. Limited\n"
  };
  smtpTransport.sendMail(mailOptions);
}

async function decodeToken(token, res) {
  try {
    let decodedToken = await jwt.decode(token, process.env.KEY);
    return decodedToken;
  } catch (e) {
    return res.status(200).sendFile("error.html", {
      root: path.join(__dirname, "../webpages/views/")
    });
  }
}

//POST ROUTE
//TO SEND EMAIL VERIFICATION LINK TO THE USER
//ACCESS PRIVATE
verifyRoute.post("/email/verify", auth, async (req, res) => {
  req.checkBody(singleEntitySchema.isValidEmail);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  var email = req.body.email;

  await admin
    .auth()
    .getUser(userID)
    .then(async () => {
      let verificationToken =
        String(Date.now() + 24 * 3600000) + "-" + email + "-" + userID;
      let encodedToken = await jwt.encode(verificationToken, process.env.KEY);
      await sendMail(email, encodedToken);
      return res.status(200).json({ message: "Verification link sent." });
    })
    .catch(() => {
      return res.status(404).json({ message: "Unauthorized" });
    });
});

//GET ROUTE
//TO VERIFY EMAIL WITH TOKEN
verifyRoute.get("/verify/:token/user/email", async (req, res) => {
  let idToken = req.params.token;
  let decodedToken = await decodeToken(idToken, res);
  let date = decodedToken.split("-")[0];
  let email = decodedToken.split("-")[1];
  let userID = decodedToken.split("-")[2];

  if (Number(Date.now() > Number(date))) {
    return res.status(200).sendFile("error.html", {
      root: path.join(__dirname, "../webpages/views/")
    });
  }

  await admin
    .auth()
    .getUser(userID)
    .then(userData => {
      if (userData.email !== email) {
        return res.status(200).sendFile("error.html", {
          root: path.join(__dirname, "../webpages/views/")
        });
      }
      return admin
        .auth()
        .updateUser(userID, {
          emailVerified: true
        })
        .then(() => {
          res.status(200).sendFile("success.html", {
            root: path.join(__dirname, "../webpages/views/")
          });
        })
        .catch(() => {
          res.status(200).sendFile("error.html", {
            root: path.join(__dirname, "../webpages/views/")
          });
        });
    })
    .catch(() => {
      return res.status(200).sendFile("error.html", {
        root: path.join(__dirname, "../webpages/views/")
      });
    });
});

module.exports = verifyRoute;
