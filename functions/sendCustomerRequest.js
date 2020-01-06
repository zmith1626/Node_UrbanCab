"use strict";

const admin = require("firebase-admin");

//Database Invocations
const dB = admin.firestore();
const FCMTOKENS = dB.collection("fcmTokens");
const Drivers = dB.collection("Drivers");
const PrivateVehicle = dB.collection("PrivateVehicles");
var requestFunction = {};

//This function sends message to Driver when a new cab request is raised or a request is cancelled by a driver.
requestFunction.sendMessageToDriver = async (
  vehicleID,
  ticketID,
  passengerData
) => {
  const getDeviceTokenPromise = FCMTOKENS.doc(vehicleID)
    .get()
    .then(snapshot => {
      return snapshot.data().fcmToken;
    });

  const results = await Promise.all([getDeviceTokenPromise]);
  let deviceToken = results[0];

  const payload = {
    notification: {
      title: "New Ride Request",
      body: `${passengerData.passengerName} is awaiting for your response.`,
      sound: "default"
    },
    data: {
      title: "NEW_RIDE_REQUEST",
      orderId: ticketID,
      userId: passengerData.passengerID,
      user: passengerData.passengerName,
      contact: passengerData.contact,
      photo: passengerData.photo,
      price: String(passengerData.price),
      compPrice: String(passengerData.compPrice),
      pickLat: String(passengerData.pickup.latitude),
      pickLng: String(passengerData.pickup.longitude),
      pick: passengerData.pickup.address,
      dropLat: String(passengerData.drop.latitude),
      dropLng: String(passengerData.drop.longitude),
      drop: passengerData.drop.address,
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };

  const response = await admin.messaging().sendToDevice(deviceToken, payload);

  response.results.forEach((results, index) => {
    const err = results.error;
    if (err) {
      console.error(err);
    }
  });

  return null;
};

//This function sends push message to public driver when a new passenger books a ticket.
requestFunction.sendNewTicketNotification = async function(vehicleID) {
  const getDeviceTokenPromise = FCMTOKENS.doc(vehicleID)
    .get()
    .then(snapshot => {
      return snapshot.data().fcmToken;
    });

  const results = await Promise.all([getDeviceTokenPromise]);
  let deviceToken = results[0];

  const payload = {
    notification: {
      title: "You have got a new Passenger.",
      body: "Open your app, to find out the details.",
      sound: "default"
    },
    data: {
      data: "NEW_BOOKING",
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };

  const response = await admin.messaging().sendToDevice(deviceToken, payload);

  response.results.forEach((results, index) => {
    const err = results.error;
    if (err) {
      console.error(err);
    }
  });

  return null;
};

//This function is used to send message to the user when a driver is assigned or none of the drivers are found.
requestFunction.sendMessageToUser = async function(
  userID,
  assignedVehicle,
  message
) {
  const getDeviceTokenPromise = FCMTOKENS.doc(userID)
    .get()
    .then(snapshot => {
      return snapshot.data().fcmToken;
    });

  if (assignedVehicle != null) {
    var driver;
    await Drivers.doc(assignedVehicle.driver)
      .get()
      .then(doc => {
        if (doc.exists) {
          driver = doc.data();
        }
      });

    var position;
    await PrivateVehicle.doc(assignedVehicle.registration)
      .get()
      .then(doc => {
        if (doc.exists) {
          position = doc.data().Position;
        }
      });
  }

  const results = await Promise.all([getDeviceTokenPromise]);
  let deviceToken = results[0];

  var payload;
  if (assignedVehicle == null) {
    payload = {
      notification: {
        title: "Ride Request Status.",
        body: message,
        sound: "default"
      },
      data: {
        title: "RIDE_REQUEST_STATUS",
        message: message,
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      }
    };
  } else {
    payload = {
      notification: {
        title: "Ride Request Status.",
        body: message,
        sound: "default"
      },
      data: {
        title: "RIDE_REQUEST_STATUS",
        otp: String(assignedVehicle.otp),
        ticketID: assignedVehicle.ticketID,
        registration: assignedVehicle.registration,
        model: assignedVehicle.model,
        driverFname: driver.firstName,
        driverLname: driver.lastName,
        license: driver.license,
        email: driver.email,
        phone: driver.phone,
        photo: driver.photo,
        latitude: String(position.geopoint.latitude),
        longitude: String(position.geopoint.longitude),
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      }
    };
  }

  const response = await admin.messaging().sendToDevice(deviceToken, payload);

  response.results.forEach((results, index) => {
    const err = results.error;
    if (err) {
      console.error(err);
    }
  });

  return null;
};

//This function is used to send notification to everyone when a booking is cancelled in Private Booking.
requestFunction.sendCancelNotification = async function(recieverId) {
  const getDeviceTokenPromise = FCMTOKENS.doc(recieverId)
    .get()
    .then(snapshot => {
      return snapshot.data().fcmToken;
    });

  const results = await Promise.all([getDeviceTokenPromise]);
  let deviceToken = results[0];

  const payload = {
    notification: {
      title: "Ride Request Cancelled.",
      body: "Current booking has been cancelled",
      sound: "default"
    },
    data: {
      title: "RIDE_CANCELLED",
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };

  const response = await admin.messaging().sendToDevice(deviceToken, payload);

  response.results.forEach((results, index) => {
    const err = results.error;
    if (err) {
      console.error(err);
    }
  });

  return null;
};

//This function is used to send notification to user when a Ride is Completed.
requestFunction.sendCompletedNotification = async function(recieverId) {
  const getDeviceTokenPromise = FCMTOKENS.doc(recieverId)
    .get()
    .then(snapshot => {
      return snapshot.data().fcmToken;
    });

  const results = await Promise.all([getDeviceTokenPromise]);
  let deviceToken = results[0];

  const payload = {
    notification: {
      title: "Ride Request Completed.",
      body: "Ride Completed, Thanks for Travelling with Expange.",
      sound: "default"
    },
    data: {
      title: "RIDE_COMPLETED",
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };

  const response = await admin.messaging().sendToDevice(deviceToken, payload);

  response.results.forEach((results, index) => {
    const err = results.error;
    if (err) {
      console.error(err);
    }
  });

  return null;
};

//This function is used to send message to the user when pickup is confirmed
requestFunction.sendPickMessageToCustomer = async function(recieverId) {
  const getDeviceTokenPromise = FCMTOKENS.doc(recieverId)
    .get()
    .then(snapshot => {
      return snapshot.data().fcmToken;
    });

  const results = await Promise.all([getDeviceTokenPromise]);
  let deviceToken = results[0];

  const payload = {
    data: {
      title: "PICKUP_CONFIRMED",
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };

  const response = await admin.messaging().sendToDevice(deviceToken, payload);

  response.results.forEach((results, index) => {
    const err = results.error;
    if (err) {
      console.error(err);
    }
  });

  return null;
};

module.exports = requestFunction;
