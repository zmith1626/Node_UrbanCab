"use strict";

const admin = require('firebase-admin');

var updateVehicleStatus = {};
updateVehicleStatus.available = async function (vehicleID) {
    await admin.firestore().collection('PrivateVehicles').doc(vehicleID).update({ status: "AVAILABLE", user: "" });
}

updateVehicleStatus.unavailable = async function (vehicleID, userId) {
    await admin.firestore().collection('PrivateVehicles').doc(vehicleID).update({ status: "ASSIGNED", user: userId });
}

module.exports = updateVehicleStatus;