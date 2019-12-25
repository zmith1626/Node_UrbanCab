"use strict";

const express = require('express'),
    admin = require('firebase-admin'),
    passSchema = require('../validator/passengerSchema'),
    seatLockSchema = require('../validator/seatLockSchema'),
    requestFunctions = require('../functions/sendCustomerRequest'),
    singleEntitySchema = require('../validator/singleEntityValidationSchema'),
    writeTicketInfo = require('../functions/writeTicket'),
    getDate = require('../functions/getCurrentDate'),
    ticketRouter = express.Router();

const dB = admin.firestore();
const Vehicle = dB.collection('Vehicles');

//This route is for booking tickets of public vehicles.
ticketRouter.post('/public/bookTicket', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(passSchema);
    const errors = req.validationErrors();
    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    var vehicleID = req.body.vehicle;
    let passCount = req.body.count;

    await admin.auth().getUser(userID).then(() => {
        Vehicle.doc(vehicleID).get().then((doc) => {
            if (doc.exists) {
                let passengerList = [];
                let occupiedSeat = 0;
                let seatCapacity = doc.data().seatCapacity;
                if (doc.data().passenger != null) {
                    passengerList = doc.data().passenger;
                    occupiedSeat = passengerList.length;
                }

                var OTP = Math.floor(1000 + (Math.random() * 9000));
                var formattedDate = getDate(req.body.date);
                let passengerData = {
                    "passengerID": userID,
                    "passengerName": req.body.name,
                    "contact": req.body.phone,
                    "photo": req.body.photo,
                    "price": req.body.price,
                    "compPrice": req.body.compPrice,
                    "pickup": req.body.pickPosition,
                    "drop": req.body.dropPosition,
                    "status": "BOOKED",
                    "OTP": OTP,
                    "date": formattedDate
                }

                if (passCount == 0) {
                    return res.status(405).json({ message: "Not Allowed" });
                }

                if (!((Number(occupiedSeat) + Number(passCount)) <= Number(seatCapacity))) {
                    return res.status(405).json({ message: "Not allowed" });
                }

                for (let i = 0; i < passCount; i++) {
                    passengerList.push(passengerData);
                }
                let passenger = {
                    "passenger": passengerList
                }

                requestFunctions.sendNewTicketNotification(vehicleID);
                return Vehicle.doc(vehicleID).update(passenger).then(() => {
                    return res.status(201).json({ message: "Booking Confirmed" });
                }).catch(() => {
                    return res.status(408).json({ message: "Request Timed Out" });
                });
            } else {
                return res.status(404).json({ message: "Vehicle Not Found" });
            }
        }).catch(() => {
            return res.status(404).json({ message: "Vehicle Not Found" });
        });
    }).catch(() => {
        return res.status(400).json({ message: "Unauthorized" });
    });
});


//This route is used to cancel booking of public vehicles.
ticketRouter.put('/public/cancelBooking', async function (req, res) {
    if (req.method !== "PUT") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(seatLockSchema.unlockSeat);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    var vehicleID = req.body.vehicle;

    await admin.auth().getUser(userID).then(() => {
        Vehicle.doc(vehicleID).get().then((doc) => {
            if (doc.exists) {
                let passengerList = [];
                let count = 0;
                passengerList = doc.data().passenger;
                passengerList.forEach((passenger) => {
                    if (passenger.passengerID == userID && passenger.status != "CANCELLED") {
                        passenger.status = "CANCELLED"
                        count = count + 1;
                    }
                });

                let newPassengerList = passengerList.filter(function (passenger) {
                    return passenger.passengerID !== userID;
                });

                if (count == 0) {
                    return res.status(405).json({ message: "Not Allowed" });
                }

                let passenger = {
                    "passenger": newPassengerList
                }
                return Vehicle.doc(vehicleID).update(passenger).then(() => {
                    res.status(200).json({ message: "Booking Cancelled" });
                }).catch(() => {
                    res.status(408).json({ message: "Request Timed Out" });
                });
            } else {
                return res.status(404).json({ message: "Vehicle Not Found" });
            }
        }).catch(() => {
            return res.status(404).json({ message: "Vehicle Not Found" });
        });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});

//This route is used for confirmation of pickup of a particular passenger.
ticketRouter.put('/public/confirmPickup', async function (req, res) {
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
    var vehicleID = req.body.vehicle;

    await admin.auth().getUser(userID).then(() => {
        Vehicle.doc(vehicleID).get().then((doc) => {
            if (doc.exists) {
                let passengerList = [];
                let count = 0;
                let driver = doc.data().driver;
                if (driver !== userID) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                passengerList = doc.data().passenger;
                passengerList.forEach((pass) => {
                    if (pass.OTP == req.body.OTP) {
                        pass.status = "ONBOARD"
                        count = count + 1;
                    }
                });
                let passenger = {
                    "passenger": passengerList
                }
                if (Number(count) > 0) {
                    return Vehicle.doc(vehicleID).update(passenger).then(() => {
                        res.status(200).json({ message: "OTP Verified" });
                    }).catch(() => {
                        res.status(408).json({ message: "Request Timed Out" });
                    });
                } else {
                    return res.status(404).json({ message: "Invalid OTP" });
                }
            } else {
                return res.status(404).json({ message: "Vehicle Not Found" });
            }
        }).catch(() => {
            return res.status(404).json({ message: "Vehicle Not Found" });
        });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});

//This route is used to fetch the ticket details of a public vehicles.
ticketRouter.post('/public/ticketDetails', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(seatLockSchema.unlockSeat);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    var vehicleID = req.body.vehicle;

    await Vehicle.doc(vehicleID).get().then(async (doc) => {
        if (doc.exists) {
            let passengerList = doc.data().passenger;
            let count = 0;
            let OTP;
            passengerList.forEach((pass) => {
                if (pass.passengerID == userID) {
                    count = count + 1;
                    OTP = pass.OTP;
                }
            });

            if (Number(count) == 0) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            let driver = doc.data().driver;
            let driverData;
            await admin.firestore().collection('Drivers').doc(driver).get().then((data) => {
                if (data.exists) {
                    driverData = {
                        "fName": data.data().firstName,
                        "lName": data.data().lastName,
                        "license": data.data().license,
                        "phone": data.data().phone,
                        "photo": data.data().photo,
                        "vehicle": data.data().vehicle,
                        "email": data.data().email
                    }
                } else {
                    return res.status(404).json({ message: "Driver data not found" });
                }
            }).catch(() => {
                return res.status(401).json({ message: "Unauthorized" });
            });

            let ticketData = {
                "OTP": OTP,
                "driverData": driverData
            }
            return res.status(200).json({ ticketData: ticketData });
        } else {
            return res.status(404).json({ message: "Vehicle Not Found" });
        }
    });
});

//This route refreshes the seat status when a passenger is dropped.
ticketRouter.put('/refreshSeat', async function (req, res) {
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

    var userID = req.headers.authorization.split('Bearer ')[1];
    var vehicleID = req.body.vehicle;

    await admin.auth().getUser(userID).then(() => {
        Vehicle.doc(vehicleID).get().then(async (doc) => {
            if (doc.exists) {
                if (doc.data().driver != userID) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                let passengerList = [];
                let count = 0;
                passengerList = doc.data().passenger;
                passengerList.forEach((passenger) => {
                    if (passenger.passengerID == req.body.passengerID) {
                        count = count + 1;
                    }
                });
                if (count == 0) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                let newPassengerList = passengerList.filter(function (passenger) {
                    return passenger.passengerID !== req.body.passengerID;
                });
                let updateData = {};
                updateData = {
                    "passenger": newPassengerList
                }

                if (newPassengerList.length == 0) {
                    updateData = {
                        "currentStatus": "AVAILABLE",
                        "passenger": newPassengerList
                    }
                }

                await writeTicketInfo(vehicleID, req.body.passengerID);
                await requestFunctions.sendCompletedNotification(req.body.passengerID);
                return Vehicle.doc(vehicleID).update(updateData).then(() => {
                    res.status(200).json({ message: "Seat Refreshed" });
                }).catch(() => {
                    res.status(408).json({ message: "Request Timed Out" });
                })
            } else {
                return res.status(404).json({ message: "Vehicle Not Found" });
            }
        }).catch(() => {
            return res.status(404).json({ message: "Vehicle Not Found" });
        });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});


//This route is called to update the status of the vehicle when a driver starts a ride.
ticketRouter.post('/update/VehicleStatus', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(singleEntitySchema.isValidStatus);
    const errors = req.validationErrors();
    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }
    var userID = req.headers.authorization.split('Bearer ')[1];
    var status = req.body.status;
    var vehicle = req.body.vehicle;

    await Vehicle.doc(vehicle).get().then((doc) => {
        if (doc.exists) {
            if (doc.data().driver !== userID) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            return Vehicle.doc(vehicle).update({ "currentStatus": status }).then(() => {
                res.status(200).json({ message: "Status Updated" });
            }).catch(() => {
                res.status(403).json({ message: "Request Timed Out" });
            });
        } else {
            return res.status(404).json({ message: "Vehicle Not Found" });
        }
    }).catch(() => {
        return res.status(404).json({ message: "Vehicle Not Found" });
    });
});

module.exports = ticketRouter;