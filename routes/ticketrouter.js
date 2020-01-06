"use strict";

const express = require("express");
const admin = require("firebase-admin");

//Schemas Invocation
const passSchema = require("../validator/passengerSchema");
const seatLockSchema = require("../validator/seatLockSchema");

//Functions Invocation
const requestFunctions = require("../functions/sendCustomerRequest");
const singleEntitySchema = require("../validator/singleEntityValidationSchema");
const writeTicketInfo = require("../functions/writeTicket");
const getDate = require("../functions/getCurrentDate");

//Middleware Invocations
const auth = require("../middleware");

const appConstant = require("../constants/appConstant");

const ticketRouter = express.Router();

//Database Invocations
const dB = admin.firestore();
const Vehicle = dB.collection("Vehicles");
const Drivers = dB.collection("Drivers");

//POST ROUTE
//TO BOOK TICKETS OF PUBLIC VEHICLE
//ACCESS PRIVATE
ticketRouter.post("/public/tickets", auth, async (req, res) => {
  req.checkBody(passSchema);
  const errors = req.validationErrors();
  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  const {
    vehicle,
    count,
    name,
    phone,
    photo,
    price,
    compPrice,
    pickPosition,
    dropPosition,
    date
  } = req.body;

  await admin
    .auth()
    .getUser(userID)
    .then(() => {
      Vehicle.doc(vehicle)
        .get()
        .then(doc => {
          if (doc.exists) {
            let passengerList = [];
            let occupiedSeat = 0;
            let seatCapacity = doc.data().seatCapacity;
            if (doc.data().passenger != null) {
              passengerList = doc.data().passenger;
              occupiedSeat = passengerList.length;
            }

            var OTP = Math.floor(1000 + Math.random() * 9000);
            var formattedDate = getDate(date);
            let passengerData = {
              passengerID: userID,
              passengerName: name,
              contact: phone,
              photo: photo,
              price: price,
              compPrice: compPrice,
              pickup: pickPosition,
              drop: dropPosition,
              status: appConstant.statusConfirmed,
              OTP: OTP,
              date: formattedDate
            };

            if (count === 0) {
              return res.status(405).json({ message: "Not Allowed" });
            }

            if (
              !(Number(occupiedSeat) + Number(count) <= Number(seatCapacity))
            ) {
              return res.status(405).json({ message: "Not allowed" });
            }

            for (let i = 0; i < count; i++) {
              passengerList.push(passengerData);
            }
            let passenger = {
              passenger: passengerList
            };

            requestFunctions.sendNewTicketNotification(vehicle);
            return Vehicle.doc(vehicle)
              .update(passenger)
              .then(() => {
                return res.status(201).json({ message: "Booking Confirmed" });
              })
              .catch(() => {
                return res.status(408).json({ message: "Request Timed Out" });
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
      return res.status(400).json({ message: "Unauthorized" });
    });
});

//PUT ROUTE
//TO CANCEL BOOKING
//ACCESS PRIVATE
ticketRouter.put("/public/tickets/cancel", auth, async (req, res) => {
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
            let passengerList = [];
            let count = 0;
            passengerList = doc.data().passenger;
            passengerList.forEach(passenger => {
              if (
                passenger.passengerID === userID &&
                passenger.status !== appConstant.statusCancelled
              ) {
                passenger.status = appConstant.statusCancelled;
                count = count + 1;
              }
            });

            let newPassengerList = passengerList.filter(passenger => {
              return passenger.passengerID !== userID;
            });

            if (count === 0) {
              return res.status(405).json({ message: "Not Allowed" });
            }

            let passenger = {
              passenger: newPassengerList
            };
            return Vehicle.doc(vehicleID)
              .update(passenger)
              .then(() => {
                res.status(200).json({ message: "Booking Cancelled" });
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
//TO CNFIRM PICKUP USING OTP
//ACCESS PRIVATE
ticketRouter.put("/public/tickets/pickup", auth, async (req, res) => {
  req.checkBody(singleEntitySchema.isValidOTP);
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
            let passengerList = [];
            let count = 0;
            let driver = doc.data().driver;
            if (driver !== userID) {
              return res.status(401).json({ message: "Unauthorized" });
            }
            passengerList = doc.data().passenger;
            passengerList.forEach(pass => {
              if (pass.OTP == req.body.OTP) {
                pass.status = appConstant.statusOnboard;
                count = count + 1;
              }
            });
            let passenger = {
              passenger: passengerList
            };
            if (Number(count) > 0) {
              return Vehicle.doc(vehicleID)
                .update(passenger)
                .then(() => {
                  res.status(200).json({ message: "OTP Verified" });
                })
                .catch(() => {
                  res.status(408).json({ message: "Request Timed Out" });
                });
            } else {
              return res.status(404).json({ message: "Invalid OTP" });
            }
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

//POST ROUTE
//TO FETCH TICKET DETAILS OF A PUBLIC VEHICLE
//PRIVATE ACCESS
ticketRouter.post("/public/tickets/detail", auth, async (req, res) => {
  req.checkBody(seatLockSchema.unlockSeat);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  var vehicleID = req.body.vehicle;

  await Vehicle.doc(vehicleID)
    .get()
    .then(async doc => {
      if (doc.exists) {
        let passengerList = doc.data().passenger;
        let count = 0;
        let OTP;
        passengerList.forEach(pass => {
          if (pass.passengerID === userID) {
            count = count + 1;
            OTP = pass.OTP;
          }
        });

        if (Number(count) === 0) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        let driver = doc.data().driver;
        let driverData;
        await Drivers.doc(driver)
          .get()
          .then(data => {
            if (data.exists) {
              driverData = {
                fName: data.data().firstName,
                lName: data.data().lastName,
                license: data.data().license,
                phone: data.data().phone,
                photo: data.data().photo,
                vehicle: data.data().vehicle,
                email: data.data().email
              };
            } else {
              return res.status(404).json({ message: "Driver data not found" });
            }
          })
          .catch(() => {
            return res.status(401).json({ message: "Unauthorized" });
          });

        let ticketData = {
          OTP: OTP,
          driverData: driverData
        };
        return res.status(200).json({ ticketData: ticketData });
      } else {
        return res.status(404).json({ message: "Vehicle Not Found" });
      }
    });
});

//PUT ROUTE
//REFRESHES THE SEAT STATUS WHEN A PASSENGER IS DROPPED
//ACCESS PRIVATE
ticketRouter.put("/public/refresh", auth, async (req, res) => {
  req.checkBody(seatLockSchema.refreshSeat);
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
        .then(async doc => {
          if (doc.exists) {
            if (doc.data().driver !== userID) {
              return res.status(401).json({ message: "Unauthorized" });
            }
            let passengerList = [];
            let count = 0;
            passengerList = doc.data().passenger;
            passengerList.forEach(passenger => {
              if (passenger.passengerID === req.body.passengerID) {
                count = count + 1;
              }
            });
            if (count === 0) {
              return res.status(401).json({ message: "Unauthorized" });
            }
            let newPassengerList = passengerList.filter(passenger => {
              return passenger.passengerID !== req.body.passengerID;
            });
            let updateData = {};
            updateData = {
              passenger: newPassengerList
            };

            if (newPassengerList.length === 0) {
              updateData = {
                currentStatus: appConstant.statusAvailable,
                passenger: newPassengerList
              };
            }

            await writeTicketInfo(vehicleID, req.body.passengerID);
            await requestFunctions.sendCompletedNotification(
              req.body.passengerID
            );
            return Vehicle.doc(vehicleID)
              .update(updateData)
              .then(() => {
                res.status(200).json({ message: "Seat Refreshed" });
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

//POST ROUTE
//UPDATES VEHICLE STATUS WHEN JOURNEY IS STARTED
//PRIVATE ACCESS
ticketRouter.post("/public/vehicle/status", auth, async (req, res) => {
  req.checkBody(singleEntitySchema.isValidStatus);
  const errors = req.validationErrors();
  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }
  var userID = req.uid;
  var status = req.body.status;
  var vehicle = req.body.vehicle;

  await Vehicle.doc(vehicle)
    .get()
    .then(doc => {
      if (doc.exists) {
        if (doc.data().driver !== userID) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        return Vehicle.doc(vehicle)
          .update({ currentStatus: status })
          .then(() => {
            res.status(200).json({ message: "Status Updated" });
          })
          .catch(() => {
            res.status(403).json({ message: "Request Timed Out" });
          });
      } else {
        return res.status(404).json({ message: "Vehicle Not Found" });
      }
    })
    .catch(() => {
      return res.status(404).json({ message: "Vehicle Not Found" });
    });
});

module.exports = ticketRouter;
