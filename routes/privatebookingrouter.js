"use strict";

const express = require('express'),
    admin = require('firebase-admin'),
    seatLockSchema = require('../validator/seatLockSchema'),
    singleEntitySchema = require('../validator/singleEntityValidationSchema'),
    privatePassSchema = require('../validator/privatePassengerSchema'),
    writeDefaultPayment = require('../functions/writeDefaultPayment'),
    updateVehicleStatus = require('../functions/privateVehicleStatus'),
    getDate = require('../functions/getCurrentDate'),
    privateBookingRoute = express.Router();

const dB = admin.firestore();
const Tickets = dB.collection('Tickets');
const requestFunction = require('../functions/sendCustomerRequest');

//This route is called to write a ticket entry in the database and send push message to the driver containing the 
//passenger request.
privateBookingRoute.post('/private/bookTicket', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(privatePassSchema);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];

    await admin.auth().getUser(userID).then(() => {
        var OTP = Math.floor(1000 + (Math.random() * 9000));
        let nearbyVehicles = [req.body.vehicle1, req.body.vehicle2, req.body.vehicle3];
        let formattedDate = getDate(req.body.date);
        let passengerData = {
            "passengerID": userID,
            "passengerName": req.body.name,
            "contact": req.body.phone,
            "photo": req.body.photo,
            "price": req.body.price,
            "compPrice": req.body.compPrice,
            "pickup": req.body.pickPosition,
            "drop": req.body.dropPosition,
            "status": "AWAITED",
            "OTP": OTP,
            "date": formattedDate,
            "nearbyVehicles": nearbyVehicles,
            "currentVehicle": 0
        }

        admin.firestore().collection('Tickets').add(passengerData).then(async (snapShot) => {
            const ticketID = snapShot.path.split('/')[1];
            await requestFunction.sendMessageToDriver(req.body.vehicle1, ticketID, passengerData);
            res.status(200).json({ message: "Finding Cab For You" });
        }).catch(() => {
            return res.status(404).json({ message: "Vehicle Not Found" });
        });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});


//This route is called to update the cab status, when a cab driver accepts or declines the cab request.
privateBookingRoute.put('/private/updateBookStatus', async function (req, res) {
    if (req.method !== "PUT") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(singleEntitySchema.isValidCabStatus);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    var ticketID = req.body.ticket;

    await admin.auth().getUser(userID).then(() => {
        Tickets.doc(ticketID).get().then(async (doc) => {
            if (doc.exists) {
                let otp = doc.data().OTP;
                let count = doc.data().currentVehicle;
                let vehicle = doc.data().nearbyVehicles;
                let passengerID = doc.data().passengerID;
                let uCount = count + 1;
                if (req.body.status == "ACCEPTED") {
                    let cVehicle = vehicle[count];
                    dB.collection('Vehicles').doc(cVehicle).get().then(async (snapShot) => {
                        var driver = snapShot.data().driver;
                        var model = snapShot.data().model;
                        var registration = snapShot.data().registration;
                        let assignedVehicle = {
                            "otp": otp,
                            "driver": driver,
                            "model": model,
                            "registration": registration,
                            "ticketID": ticketID
                        }

                        let updatedData = {
                            "assignedVehicle": assignedVehicle,
                            "status": "BOOKING CONFIRMED"
                        }

                        updateVehicleStatus.unavailable(cVehicle, passengerID);
                        return Tickets.doc(ticketID).update(updatedData).then(async () => {
                            await requestFunction.sendMessageToUser(passengerID, assignedVehicle, "Booking Confirmed, Open app to find out the information of the Cab.");
                            res.status(200).json({ message: "Booking Confirmed" });
                        }).catch(() => {
                            res.status(408).json({ message: "Request Timed Out" });
                        });
                    }).catch(() => {
                        return res.status(408).json({ message: "Request Timed Out" });
                    });
                } else {
                    let newVehicle = vehicle[uCount];
                    if (newVehicle == "NA") {
                        await requestFunction.sendMessageToUser(passengerID, null, "No Cabs Available, Please try again Later");
                        return Tickets.doc(ticketID).delete().then(() => {
                            res.status(200).json({ message: "Declined Request Accepted" });
                        }).catch(() => {
                            res.status(403).json({ message: "Request Timed Out" });
                        });
                    } else {
                        let passengerData = doc.data();
                        await requestFunction.sendMessageToDriver(newVehicle, ticketID, passengerData);
                        return Tickets.doc(ticketID).update({ "currentVehicle": uCount }).then(() => {
                            res.status(200).json({ message: "Declined Request Accepted" });
                        }).catch(() => {
                            res.status(403).json({ message: "Request Timed Out" });
                        });
                    }
                }
            } else {
                return res.status(404).json({ message: "Ticket Not Found" });
            }
        }).catch(() => {
            return res.status(404).json({ message: "Ticket Not Found" });
        });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthoized" });
    });
});

//This route is called to confirm the pickup of passenger by private vehicles.
privateBookingRoute.put('/private/confirmPickup', async function (req, res) {
    if (req.method !== "PUT") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(singleEntitySchema.isValidOTP);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    var ticketID = req.body.vehicle;
    await Tickets.doc(ticketID).get().then(async (doc) => {
        if (doc.exists) {
            if (doc.data().assignedVehicle.driver != userID) {
                return res.status(401).json({ message: "unauthorized" });
            }

            if (doc.data().OTP == req.body.OTP) {
                var id = doc.data().passengerID;
                await requestFunction.sendPickMessageToCustomer(id);
                return Tickets.doc(ticketID).update({ "status": "ONBOARD" }).then(() => {
                    res.status(200).json({ message: "Pickup Confirmed" });
                }).catch(() => {
                    res.status(408).json({ message: "Request Timed Out" });
                });
            } else {
                return res.status(401).json({ message: "Invalid OTP" });
            }
        } else {
            return res.status(404).json({ message: "Invalid Ticket Reference" });
        }
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});

//This route is called when a booking is cancelled by a cab driver or user.
privateBookingRoute.put('/private/cancelBooking', async function (req, res) {
    if (req.method !== "PUT") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(singleEntitySchema.isValidCabStatus);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    var ticketID = req.body.ticket;
    await Tickets.doc(ticketID).get().then(async (doc) => {
        if (doc.exists) {
            if (doc.data().passengerID != userID && doc.data().assignedVehicle.driver != userID) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            let recieverId = doc.data().assignedVehicle.registration;

            if (doc.data().assignedVehicle.driver == userID) {
                let price = doc.data().price;
                await writeDefaultPayment.writePayment(userID, price);
                recieverId = doc.data().passengerID
            }

            await requestFunction.sendCancelNotification(recieverId);
            updateVehicleStatus.available(doc.data().assignedVehicle.registration);
            return Tickets.doc(ticketID).update({ "status": "CANCELLED" }).then(() => {
                res.status(200).json({ message: "Booking Cancelled" });
            }).catch(() => {
                res.status(408).json({ message: "Request Timed Out" });
            });
        } else {
            return res.status(404).json({ message: "Invalid Ticket Reference" });
        }
    }).catch(() => {
        return res.status(404).json({ message: "Invalid Ticket Reference" });
    });
});

//This route is called when a driver completes the inbound journey and marks as complete.
privateBookingRoute.put('/private/refreshStatus', async function (req, res) {
    if (req.method !== "PUT") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(seatLockSchema.refreshSeat);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var ticketID = req.body.vehicle;
    var passengerID = req.body.passengerID;
    var userID = req.headers.authorization.split('Bearer ')[1];

    await Tickets.doc(ticketID).get().then(async (doc) => {
        if (doc.exists) {
            if (doc.data().assignedVehicle.driver !== userID) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            if (doc.data().passengerID !== passengerID) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            updateVehicleStatus.available(doc.data().assignedVehicle.registration);
            await requestFunction.sendCompletedNotification(passengerID);
            return Tickets.doc(ticketID).update({ status: "COMPLETED" }).then(() => {
                res.status(200).json({ message: "Status Refreshed" });
            }).catch(() => {
                res.status(403).json({ message: "Request Timed Out" });
            });
        } else {
            return res.status(404).json({ message: "invalid Ticket Reference" });
        }
    }).catch(() => {
        return res.status(404).json({ message: "Invalid Ticket Reference" });
    });
});


//This route is called to update the status(availability) of the vehicle.
privateBookingRoute.put('/private/updateVehicleStatus', async function (req, res) {
    if (req.method !== "PUT") {
        res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(singleEntitySchema.isValidStatus);
    const errors = req.validationErrors();

    let vehicle = req.body.vehicle;
    let status = req.body.status;

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    await dB.collection('PrivateVehicles').doc(vehicle).update({ status: status }).then(() => {
        return res.status(200).json({ message: "Status Updated" });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});

module.exports = privateBookingRoute;