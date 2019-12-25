"use strict";

const express = require('express'),
    admin = require('firebase-admin'),
    seatLockSchema = require('../validator/seatLockSchema'),
    singleEntitySchema = require('../validator/singleEntityValidationSchema'),
    timelineRoute = express.Router();

const dB = admin.firestore();
const Vehicle = dB.collection('Vehicles');

//This route is used to reverse the stoppage sequence of a vehicle and add a next travel start time of one hour.
timelineRoute.put('/setTime', async function (req, res) {
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

    admin.auth().getUser(userID).then(() => {
        Vehicle.doc(vehicleID).get().then((doc) => {
            if (doc.exists) {
                if (userID != doc.data().driver) {
                    return res.status(401).json({ message: "Unauthorized" });
                }

                let date = new Date();
                let cTime = Number((date.getHours() + 5) * 60) + Number(date.getMinutes() + 30);
                let uTime = Math.floor((cTime + 60) / 60);
                let uMin = (cTime + 60) % 60;
                let uFormattedTime = (Number(uTime) >= 24 ? (Number(uTime) - 24) : uTime) + ':' + uMin;
                let stopList = [];
                stopList = doc.data().currentStops;
                let updatedLists = stopList.reverse();
                let updatedState = {
                    "passenger": [],
                    "currentStops": updatedLists,
                    "currentTime": String(uFormattedTime),
                    "currentStatus": "YET TO START"
                }
                return Vehicle.doc(vehicleID).update(updatedState).then(() => {
                    res.status(200).json({ message: "Vehicle Status updated" });
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

//This route is used to reset the data of public vehicle, it is generally called at the end of the day.
timelineRoute.put('/reset', async function (req, res) {
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
                if (doc.data().driver != userID) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                let currentStops = [];
                let currentTime = doc.data().startTime;
                currentStops = doc.data().stoppage;
                let vehicleData = {
                    "currentTime": currentTime,
                    "currentStops": currentStops,
                    "currentStatus": "UNAVAILABLE"
                }

                return Vehicle.doc(vehicleID).update(vehicleData).then(() => {
                    res.status(200).json({ message: "Vehicle Status Reset" });
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

//This route is called to update the status of the vehicle, to availability and unavailability.
timelineRoute.put('/updateStatus', async function (req, res) {
    if (req.method !== "PUT") {
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
    var vehicleID = req.body.vehicle;
    var status = req.body.status;

    await Vehicle.doc(vehicleID).get().then((doc) => {
        if (doc.exists) {
            if (doc.data().driver != userID) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            let vehicleData = {
                "currentStatus": status
            }
            return Vehicle.doc(vehicleID).update(vehicleData).then(() => {
                res.status(200).json({ message: "Status Updated" });
            }).catch(() => {
                res.status(408).json({ message: "Request Timed Out" });
            });
        } else {
            return res.status(404).json({ message: "Vehicle Not Found" });
        }
    }).catch(() => {
        return res.status(404).json({ message: "Vehicle Not Found" });
    });
});

//This route is called to fetch the list of passenger for a public vehicle.
timelineRoute.post('/getPassengers', async function (req, res) {
    if (req.method !== 'POST') {
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

    await Vehicle.doc(vehicleID).get().then((doc) => {
        if (doc.exists) {
            if (doc.data().driver !== userID) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            let passengerData = doc.data().passenger;
            return res.status(200).json({ message: "OK", data: passengerData });
        } else {
            res.status(404).json({ message: "Vehicle Not Found" });
        }
    }).catch(() => {
        res.status(404).json({ message: "Vehicle Not Found" });
    });
});

module.exports = timelineRoute;