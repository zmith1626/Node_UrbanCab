"use strict";

const express = require("express");
const admin = require("firebase-admin");

//Schemas Invocation
const seatLockSchema = require("../validator/seatLockSchema");
const singleEntitySchema = require("../validator/singleEntityValidationSchema");

//Middleware Invocation
const auth = require("../middleware");

const timelineRoute = express.Router();

const appConstant = require("../constants/appConstant");

//Database Invocation
const dB = admin.firestore();
const Vehicle = dB.collection("Vehicles");

//PUT ROUTE
//TO SET JOURNEY START TIME OF A PUBLIC VEHICLE
//ACCESS PRIVATE
timelineRoute.put("/settime", auth, async (req, res) => {
  req.checkBody(seatLockSchema.unlockSeat);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  var vehicleID = req.body.vehicle;

  admin
    .auth()
    .getUser(userID)
    .then(() => {
      Vehicle.doc(vehicleID)
        .get()
        .then(doc => {
          if (doc.exists) {
            if (userID !== doc.data().driver) {
              return res.status(401).json({ message: "Unauthorized" });
            }

            let date = new Date();
            let cTime =
              Number((date.getHours() + 5) * 60) +
              Number(date.getMinutes() + 30);
            let uTime = Math.floor((cTime + 60) / 60);
            let uMin = (cTime + 60) % 60;
            let uFormattedTime =
              (Number(uTime) >= 24 ? Number(uTime) - 24 : uTime) + ":" + uMin;
            let stopList = [];
            stopList = doc.data().currentStops;
            let updatedLists = stopList.reverse();
            let updatedState = {
              passenger: [],
              currentStops: updatedLists,
              currentTime: String(uFormattedTime),
              currentStatus: appConstant.statusYetToStart
            };

            return Vehicle.doc(vehicleID)
              .update(updatedState)
              .then(() => {
                res.status(200).json({ message: "Vehicle Status updated" });
              })
              .catch(() => {
                res.status(408).json({ message: "Request Timed Out" });
              });
          } else {
            return res.status(404).json({ message: "Vehicle Not Found" });
          }
        })
        .catch(() => {
          return res.status(404).json({ message: "Vehicle Not Found" });
        });
    })
    .catch(() => {
      return res.status(401).json({ message: "Unauthorized" });
    });
});

//PUT ROUTE
//TO RESET VEHICLE CURRENT STATUS, CALLED BY EOD
//ACCESS PRIVATE
timelineRoute.put("/reset", auth, async (req, res) => {
  req.checkBody(seatLockSchema.unlockSeat);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  var vehicleID = req.body.vehicle;

  await admin
    .auth()
    .getUser(userID)
    .then(() => {
      Vehicle.doc(vehicleID)
        .get()
        .then(doc => {
          if (doc.exists) {
            if (doc.data().driver !== userID) {
              return res.status(401).json({ message: "Unauthorized" });
            }
            let currentStops = [];
            let currentTime = doc.data().startTime;
            currentStops = doc.data().stoppage;
            let vehicleData = {
              currentTime: currentTime,
              currentStops: currentStops,
              currentStatus: appConstant.statusNA
            };

            return Vehicle.doc(vehicleID)
              .update(vehicleData)
              .then(() => {
                res.status(200).json({ message: "Vehicle Status Reset" });
              })
              .catch(() => {
                res.status(408).json({ message: "Request Timed Out" });
              });
          } else {
            return res.status(404).json({ message: "Vehicle Not Found" });
          }
        })
        .catch(() => {
          return res.status(404).json({ message: "Vehicle Not Found" });
        });
    })
    .catch(() => {
      return res.status(401).json({ message: "Unauthorized" });
    });
});

//PUT ROUTE
//TO UPDATE VEHICLE STATUS TO A OR N/A
//ACCESS PRIVATE
timelineRoute.put("/status", auth, async (req, res) => {
  req.checkBody(singleEntitySchema.isValidStatus);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  var vehicleID = req.body.vehicle;
  var status = req.body.status;

  await Vehicle.doc(vehicleID)
    .get()
    .then(doc => {
      if (doc.exists) {
        if (doc.data().driver != userID) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        let vehicleData = {
          currentStatus: status
        };
        return Vehicle.doc(vehicleID)
          .update(vehicleData)
          .then(() => {
            res.status(200).json({ message: "Status Updated" });
          })
          .catch(() => {
            res.status(408).json({ message: "Request Timed Out" });
          });
      } else {
        return res.status(404).json({ message: "Vehicle Not Found" });
      }
    })
    .catch(() => {
      return res.status(404).json({ message: "Vehicle Not Found" });
    });
});

//POST ROUTE
//TO FETCH THE LIST OF PASSENGER IN A PASSENGER VEHICLE
//ACCESS PRIVATE
timelineRoute.post("/passengers", auth, async (req, res) => {
  req.checkBody(seatLockSchema.unlockSeat);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  var vehicleID = req.body.vehicle;

  await Vehicle.doc(vehicleID)
    .get()
    .then(doc => {
      if (doc.exists) {
        if (doc.data().driver !== userID) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        let passengerData = doc.data().passenger;
        return res.status(200).json({ message: "OK", data: passengerData });
      } else {
        res.status(404).json({ message: "Vehicle Not Found" });
      }
    })
    .catch(() => {
      res.status(404).json({ message: "Vehicle Not Found" });
    });
});

module.exports = timelineRoute;
