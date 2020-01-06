"use strict";

const admin = require("firebase-admin");
const appConstant = require("../constants/appConstant");

//Database Invocation
const dB = admin.firestore();
const PrivateVehicle = dB.collection("PrivateVehicles");

var updateVehicleStatus = {};
updateVehicleStatus.available = async vehicleID => {
  await PrivateVehicle.doc(vehicleID).update({
    status: appConstant.statusAvailable,
    user: ""
  });
};

updateVehicleStatus.unavailable = async (vehicleID, userId) => {
  await PrivateVehicle.doc(vehicleID).update({
    status: appConstant.statusAssigned,
    user: userId
  });
};

module.exports = updateVehicleStatus;
