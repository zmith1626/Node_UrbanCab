"use strict";

const express = require("express");
const admin = require("firebase-admin");

//Schemas Invocation
const seatLockSchema = require("../validator/seatLockSchema");
const singleEntitySchema = require("../validator/singleEntityValidationSchema");
const privatePassSchema = require("../validator/privatePassengerSchema");

//Functions Invocation
const writeDefaultPayment = require("../functions/writeDefaultPayment");
const updateVehicleStatus = require("../functions/privateVehicleStatus");
const getDate = require("../functions/getCurrentDate");
const requestFunction = require("../functions/sendCustomerRequest");

//Middleware Invocation
const auth = require("../middleware");
const appConstant = require("../constants/appConstant");

const privateBookingRoute = express.Router();

//Database Invocation
const dB = admin.firestore();
const Tickets = dB.collection("Tickets");
const Vehicles = dB.collection("Vehicles");
const PrivateVehicle = dB.collection("PrivateVehicles");

//POST ROUTE
//WRITE TICKET DATA IN DB AND SEND NOTIFICATION TO THE DRIVER
//ACCESS PRIVATE
privateBookingRoute.post("/private/tickets", auth, async (req, res) => {
  req.checkBody(privatePassSchema);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  const {
    vehicle1,
    vehicle2,
    vehicle3,
    date,
    name,
    phone,
    photo,
    price,
    compPrice,
    pickPosition,
    dropPosition
  } = req.body;

  await admin
    .auth()
    .getUser(userID)
    .then(() => {
      var OTP = Math.floor(1000 + Math.random() * 9000);
      let nearbyVehicles = [vehicle1, vehicle2, vehicle3];
      let formattedDate = getDate(date);
      let passengerData = {
        passengerID: userID,
        passengerName: name,
        contact: phone,
        photo: photo,
        price: price,
        compPrice: compPrice,
        pickup: pickPosition,
        drop: dropPosition,
        status: appConstant.statusAwaited,
        OTP: OTP,
        date: formattedDate,
        nearbyVehicles: nearbyVehicles,
        currentVehicle: 0
      };

      Tickets.add(passengerData)
        .then(async snapShot => {
          const ticketID = snapShot.path.split("/")[1];
          await requestFunction.sendMessageToDriver(
            req.body.vehicle1,
            ticketID,
            passengerData
          );
          return res.status(200).json({ message: "Finding Cab For You" });
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
//UPDATE TICKET STATUS TO ACCEPT OR DECLINE. IF DECLINED, SENDS REQUEST TO THE NEXT NEARBY DRIVER
//PRIVATE ROUTE
privateBookingRoute.put("/private/tickets", auth, async (req, res) => {
  req.checkBody(singleEntitySchema.isValidCabStatus);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  var ticketID = req.body.ticket;

  await admin
    .auth()
    .getUser(userID)
    .then(() => {
      Tickets.doc(ticketID)
        .get()
        .then(async doc => {
          if (doc.exists) {
            let otp = doc.data().OTP;
            let count = doc.data().currentVehicle;
            let vehicle = doc.data().nearbyVehicles;
            let passengerID = doc.data().passengerID;
            let uCount = count + 1;

            if (req.body.status === appConstant.statusAccepted) {
              let cVehicle = vehicle[count];

              Vehicles.doc(cVehicle)
                .get()
                .then(async snapShot => {
                  const { driver, model, registration } = snapShot.data();
                  let assignedVehicle = {
                    otp: otp,
                    driver: driver,
                    model: model,
                    registration: registration,
                    ticketID: ticketID
                  };

                  let updatedData = {
                    assignedVehicle: assignedVehicle,
                    status: appConstant.statusConfirmed
                  };

                  updateVehicleStatus.unavailable(cVehicle, passengerID);
                  return Tickets.doc(ticketID)
                    .update(updatedData)
                    .then(async () => {
                      await requestFunction.sendMessageToUser(
                        passengerID,
                        assignedVehicle,
                        appConstant.bookingCnfMsg
                      );
                      res.status(200).json({ message: "Booking Confirmed" });
                    })
                    .catch(() => {
                      res.status(408).json({ message: "Request Timed Out" });
                    });
                })
                .catch(() => {
                  return res.status(408).json({ message: "Request Timed Out" });
                });
            } else {
              let newVehicle = vehicle[uCount];
              if (newVehicle === appConstant.statusUnavailable) {
                await requestFunction.sendMessageToUser(
                  passengerID,
                  null,
                  appConstant.unavailableMsg
                );
                return Tickets.doc(ticketID)
                  .delete()
                  .then(() => {
                    res
                      .status(200)
                      .json({ message: "Declined Request Accepted" });
                  })
                  .catch(() => {
                    res.status(403).json({ message: "Request Timed Out" });
                  });
              } else {
                let passengerData = doc.data();
                await requestFunction.sendMessageToDriver(
                  newVehicle,
                  ticketID,
                  passengerData
                );
                return Tickets.doc(ticketID)
                  .update({ currentVehicle: uCount })
                  .then(() => {
                    res
                      .status(200)
                      .json({ message: "Declined Request Accepted" });
                  })
                  .catch(() => {
                    res.status(403).json({ message: "Request Timed Out" });
                  });
              }
            }
          } else {
            return res.status(404).json({ message: "Ticket Not Found" });
          }
        })
        .catch(() => {
          return res.status(404).json({ message: "Ticket Not Found" });
        });
    })
    .catch(() => {
      return res.status(401).json({ message: "Unauthorized" });
    });
});

//PUT ROUTE
//TO CONFIRM PASSENGER PICKUP USING THE OTP PROVIDED
//ACCESS PRIVATE
privateBookingRoute.put("/private/tickets/pickup", auth, async (req, res) => {
  req.checkBody(singleEntitySchema.isValidOTP);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  var ticketID = req.body.vehicle;

  await Tickets.doc(ticketID)
    .get()
    .then(async doc => {
      if (doc.exists) {
        if (doc.data().assignedVehicle.driver != userID) {
          return res.status(401).json({ message: "unauthorized" });
        }

        if (doc.data().OTP == req.body.OTP) {
          var id = doc.data().passengerID;
          await requestFunction.sendPickMessageToCustomer(id);
          return Tickets.doc(ticketID)
            .update({ status: appConstant.statusOnboard })
            .then(() => {
              res.status(200).json({ message: "Pickup Confirmed" });
            })
            .catch(() => {
              res.status(408).json({ message: "Request Timed Out" });
            });
        } else {
          return res.status(401).json({ message: "Invalid OTP" });
        }
      } else {
        return res.status(404).json({ message: "Invalid Ticket Reference" });
      }
    })
    .catch(() => {
      return res.status(401).json({ message: "Unauthorized" });
    });
});

//PUT ROUTE
//API TO CANCEL A RIDE
//ACCESS PRIVATE
privateBookingRoute.put("/private/tickets/cancel", auth, async (req, res) => {
  req.checkBody(singleEntitySchema.isValidCabStatus);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var userID = req.uid;
  var ticketID = req.body.ticket;

  await Tickets.doc(ticketID)
    .get()
    .then(async doc => {
      if (doc.exists) {
        if (
          doc.data().passengerID != userID &&
          doc.data().assignedVehicle.driver != userID
        ) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        let recieverId = doc.data().assignedVehicle.registration;

        if (doc.data().assignedVehicle.driver == userID) {
          let price = doc.data().price;
          await writeDefaultPayment.writePayment(userID, price);
          recieverId = doc.data().passengerID;
        }

        await requestFunction.sendCancelNotification(recieverId);
        updateVehicleStatus.available(doc.data().assignedVehicle.registration);
        return Tickets.doc(ticketID)
          .update({ status: "CANCELLED" })
          .then(() => {
            res.status(200).json({ message: "Booking Cancelled" });
          })
          .catch(() => {
            res.status(408).json({ message: "Request Timed Out" });
          });
      } else {
        return res.status(404).json({ message: "Invalid Ticket Reference" });
      }
    })
    .catch(() => {
      return res.status(404).json({ message: "Invalid Ticket Reference" });
    });
});

//PUT ROUTE
//REFRESHES SEAT STATUS WHEN A PASSENGER IS DROPPED
//ACCESS PRIVATE
privateBookingRoute.put("/private/ticktes/refresh", auth, async (req, res) => {
  req.checkBody(seatLockSchema.refreshSeat);
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  var ticketID = req.body.vehicle;
  var passengerID = req.body.passengerID;
  var userID = req.uid;

  await Tickets.doc(ticketID)
    .get()
    .then(async doc => {
      if (doc.exists) {
        if (doc.data().assignedVehicle.driver !== userID) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        if (doc.data().passengerID !== passengerID) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        updateVehicleStatus.available(doc.data().assignedVehicle.registration);
        await requestFunction.sendCompletedNotification(passengerID);
        return Tickets.doc(ticketID)
          .update({ status: appConstant.statusCompleted })
          .then(() => {
            res.status(200).json({ message: "Status Refreshed" });
          })
          .catch(() => {
            res.status(403).json({ message: "Request Timed Out" });
          });
      } else {
        return res.status(404).json({ message: "invalid Ticket Reference" });
      }
    })
    .catch(() => {
      return res.status(404).json({ message: "Invalid Ticket Reference" });
    });
});

//PUT ROUTE
//TO UPDATE AVAILABILITY STATUS OF A VEHICLE
//PRIVATE ACCESS
privateBookingRoute.put("/private/vehicle", async (req, res) => {
  req.checkBody(singleEntitySchema.isValidStatus);
  const errors = req.validationErrors();

  let vehicle = req.body.vehicle;
  let status = req.body.status;

  if (errors) {
    return res.status(400).json({ message: errors[0].msg });
  }

  await PrivateVehicle.doc(vehicle)
    .update({ status: status })
    .then(() => {
      return res.status(200).json({ message: "Status Updated" });
    })
    .catch(() => {
      return res.status(500).json({ message: "Internal Server Error" });
    });
});

module.exports = privateBookingRoute;
