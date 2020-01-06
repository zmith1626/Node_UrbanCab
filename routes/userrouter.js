"use strict";

const express = require("express");
const admin = require("firebase-admin");

//Schemas Invocation
const profileSchema = require("../validator/profilevalidationSchema");
const singleValidationSchema = require("../validator/singleEntityValidationSchema");

//Middleware Invocation
const auth = require("../middleware");

const appConstant = require("../constants/appConstant");

const userRoute = express.Router();

//Database Invocation
const dB = admin.firestore();
const Drivers = dB.collection("Drivers");
const Vehicles = dB.collection("Vehicles");
const PrivateVehicles = dB.collection("PrivateVehicles");
const Tickets = dB.collection("Tickets");

//GET ROUTE
//TO LOAD DRIVER PROFILE BASED ON TYPE- PUBLIC OR PRIVATE
//ACCESS PRIVATE
userRoute.get("/drivers/:type", auth, async (req, res) => {
  if (
    req.params.type !== appConstant.publicVehicle &&
    req.params.type !== appConstant.privateVehicle
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  var userID = req.uid;

  await admin
    .auth()
    .getUser(userID)
    .then(() => {
      return Drivers.doc(userID)
        .get()
        .then(async doc => {
          if (doc.exists) {
            var status;
            let vehicleId = doc.data().vehicle;
            if (req.params.type === appConstant.publicVehicle) {
              status = Vehicles.doc(vehicleId)
                .get()
                .then(snapshot => {
                  return snapshot.data().currentStatus;
                });
            } else {
              status = PrivateVehicles.doc(vehicleId)
                .get()
                .then(snapshot => {
                  return snapshot.data().status;
                });
            }

            const vehicleStatus = await Promise.all([status]);
            res
              .status(200)
              .json({ message: "OK", data: doc.data(), status: vehicleStatus });
          } else {
            res.status(404).json({ message: "Driver Data Not Found" });
          }
        })
        .catch(() => {
          res.status(404).json({ message: "Driver Data Not Found" });
        });
    })
    .catch(() => {
      return res.status(401).json({ message: "Unauthorized" });
    });
});

//GET ROUTE
//TO LOAD THE USER PROFILE
//ACCESS PRIVATE
userRoute.get("/user/profile", auth, async (req, res) => {
  var userID = req.uid;
  await admin
    .auth()
    .getUser(userID)
    .then(userData => {
      return res.status(200).json({ message: "OK", data: userData });
    })
    .catch(() => {
      return res.status(401).json({ message: "Unauthorized" });
    });
});

//POST ROUTE
//UPDATE DRIVER PROFILE
//PRIVATE ACCESS
userRoute.post("/driver/profile", auth, async (req, res) => {
  req.checkBody(profileSchema.isValidProfileData);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  const { fName, lName, email, phone, photo, photoPath } = req.body;

  let driverData = {
    firstName: fName,
    lastName: lName,
    email: email,
    phone: phone,
    photo: photo,
    imagePath: photoPath
  };

  await Drivers.doc(userID)
    .update(driverData)
    .then(() => {
      return res.status(200).json({ message: "Profile Updated" });
    })
    .catch(() => {
      return res.status(401).json({ message: "Unauthorized" });
    });
});

//POST ROUTE
//TO UPDATE USER PROFILE
//PRIVATE ACCESS
userRoute.post("/user/profile", auth, async (req, res) => {
  req.checkBody(profileSchema.isValidProfileData);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  const { phone, fName, lName, photoPath, email, photo } = req.body;
  let formattedPhone = "+91" + phone;

  let userData = {
    displayName: fName + " " + lName + `Bearer ${photoPath}`,
    email: email,
    phoneNumber: formattedPhone,
    photoURL: photo
  };

  await admin
    .auth()
    .updateUser(userID, userData)
    .then(() => {
      return res.status(200).json({ message: "Profile Updated" });
    })
    .catch(() => {
      return res.status(401).json({ message: "Unauthorized" });
    });
});

//POST ROUTE
//TO FETCH ALL THE RIDES MADE BY USER
//PRIVATE ACCESS
userRoute.post("/user/rides", auth, async (req, res) => {
  if (req.body.RIDE_USER !== "RIDE_USER") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  var userID = req.headers.authorization.split("Bearer ")[1];

  await Tickets.get()
    .then(snapshot => {
      let documentsSnapshots = [];
      snapshot.forEach(snap => {
        if (snap.data().passengerID == userID) {
          let docSnap = {
            id: snap.id,
            data: snap.data()
          };

          documentsSnapshots.push(docSnap);
        }
      });
      return res
        .status(200)
        .json({ message: "OK", tripData: documentsSnapshots });
    })
    .catch(() => {
      return res.status(404).json({ message: "No records found" });
    });
});

//POST ROUTE
//TO FETCH ALL THE DRIVERS RIDE
//ACCESS PRIVATE
userRoute.post("/driver/rides", auth, async (req, res) => {
  if (req.body.RIDE_DRIVER !== "RIDE_DRIVER") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  var userID = req.uid;

  await Tickets.get()
    .then(snapshot => {
      let documentsSnapshots = [];
      snapshot.forEach(snap => {
        if (snap.data().assignedVehicle != null) {
          if (snap.data().assignedVehicle.driver == userID) {
            let docSnap = {
              id: snap.id,
              data: snap.data()
            };

            documentsSnapshots.push(docSnap);
          }
        }
      });
      return res
        .status(200)
        .json({ message: "OK", tripData: documentsSnapshots });
    })
    .catch(() => {
      return res.status(404).json({ message: "No records found" });
    });
});

//POST ROUTE
//TO RESET DRIVER PASSWORD
//ACCESS PRIVATE
userRoute.post("/driver/password/reset", auth, async (req, res) => {
  req.checkBody(singleValidationSchema.isValidPassword);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;

  await admin
    .auth()
    .getUser(userID)
    .then(userRecord => {
      return admin
        .auth()
        .updateUser(userRecord.uid, {
          password: req.body.password
        })
        .then(() => {
          res.status(200).json({ message: "Password has been Reset" });
        })
        .catch(() => {
          res.status(401).json({ message: "Unauthorized" });
        });
    })
    .catch(() => {
      return res.status(401).json({ message: "Unauthorized" });
    });
});

module.exports = userRoute;
