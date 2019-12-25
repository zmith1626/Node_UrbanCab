"use strict";

const express = require('express'),
    admin = require('firebase-admin'),
    profileSchema = require('../validator/profilevalidationSchema'),
    singleValidationSchema = require('../validator/singleEntityValidationSchema'),
    userRoute = express.Router();

const dB = admin.firestore();
const Drivers = dB.collection('Drivers');

//This route is called to load the driver profile.
userRoute.get('/driverDetails/:vehicleType', async function (req, res) {
    if (req.method !== 'GET') {
        return res.status(400).json({ message: "Bad request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.params.vehicleType !== "PUBLIC" && req.params.vehicleType !== "PRIVATE") {
        return res.status(401).json({ message: "Unauthorized" });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    await admin.auth().getUser(userID).then(() => {
        return Drivers.doc(userID).get().then(async (doc) => {
            if (doc.exists) {
                var status;
                let vehicleId = doc.data().vehicle;
                if (req.params.vehicleType == "PUBLIC") {
                    status = admin.firestore().collection('Vehicles').doc(vehicleId).get().then((snapshot) => {
                        return snapshot.data().currentStatus;
                    });
                } else {
                    status = admin.firestore().collection('PrivateVehicles').doc(vehicleId).get().then((snapshot) => {
                        return snapshot.data().status;
                    });
                }

                const vehicleStatus = await Promise.all([status]);
                res.status(200).json({ message: "OK", data: doc.data(), status: vehicleStatus });

            } else {
                res.status(404).json({ message: "Driver Data Not Found" });
            }
        }).catch(() => {
            res.status(404).json({ message: "Driver Data Not Found" });
        });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    })
});


//This route is called to load the user profile.
userRoute.get('/userDetails', async function (req, res) {
    if (req.method !== 'GET') {
        return res.status(400).json({ message: "Bad request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    await admin.auth().getUser(userID).then((userData) => {
        return res.status(200).json({ message: "OK", data: userData });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});

//This Route is called to update the driver profile.
userRoute.post('/update/driverProfile', async function (req, res) {
    if (req.method !== 'POST') {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(profileSchema.isValidProfileData);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    let driverData = {
        "firstName": req.body.fName,
        "lastName": req.body.lName,
        "email": req.body.email,
        "phone": req.body.phone,
        "photo": req.body.photo,
        "imagePath": req.body.photoPath
    }
    await Drivers.doc(userID).update(driverData).then(() => {
        return res.status(200).json({ message: "Profile Updated" });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});

//This route is called to update the user profile.
userRoute.post('/update/userProfile', async function (req, res) {
    if (req.method !== 'POST') {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(profileSchema.isValidProfileData);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    let phone = '+91' + req.body.phone;
    let userData = {
        "displayName": req.body.fName + ' ' + req.body.lName + `Bearer ${req.body.photoPath}`,
        "email": req.body.email,
        "phoneNumber": phone,
        "photoURL": req.body.photo
    }
    await admin.auth().updateUser(userID, userData).then(() => {
        return res.status(200).json({ message: "Profile Updated" });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});

//This route is called to fetch the user rides.
userRoute.post('/user/rides', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.body.RIDE_USER !== "RIDE_USER") {
        return res.status(401).json({ message: "Unauthorized" });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];

    await dB.collection('Tickets').get().then((snapshot) => {
        let documentsSnapshots = [];
        snapshot.forEach((snap) => {
            if (snap.data().passengerID == userID) {
                let docSnap = {
                    "id": snap.id,
                    "data": snap.data()
                }

                documentsSnapshots.push(docSnap);
            }
        });
        return res.status(200).json({ message: "OK", tripData: documentsSnapshots });
    }).catch(() => {
        return res.status(404).json({ message: "No records found" });
    });
});

//This function is called to get the driver rides.
userRoute.post('/driver/rides', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.body.RIDE_DRIVER !== "RIDE_DRIVER") {
        return res.status(401).json({ message: "Unauthorized" });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];

    await dB.collection('Tickets').get().then((snapshot) => {
        let documentsSnapshots = [];
        snapshot.forEach((snap) => {
            if (snap.data().assignedVehicle != null) {
                if (snap.data().assignedVehicle.driver == userID) {
                    let docSnap = {
                        "id": snap.id,
                        "data": snap.data()
                    }

                    documentsSnapshots.push(docSnap);
                }
            }
        });
        return res.status(200).json({ message: "OK", tripData: documentsSnapshots });
    }).catch(() => {
        return res.status(404).json({ message: "No records found" });
    });
});

//This function is called to reset the driver password.
userRoute.post('/driver/resetPassword', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    req.checkBody(singleValidationSchema.isValidPassword);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    var userID = req.headers.authorization.split('Bearer ')[1];
    await admin.auth().getUser(userID).then((userRecord) => {
        return admin.auth().updateUser(userRecord.uid, {
            password: req.body.password
        }).then(() => {
            res.status(200).json({ message: "Password has been Reset" });
        }).catch(() => {
            res.status(401).json({ message: "Unauthorized" });
        });
    }).catch(() => {
        return res.status(401).json({ message: "Unauthorized" });
    });
});

module.exports = userRoute;