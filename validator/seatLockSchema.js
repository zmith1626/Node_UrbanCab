"use strict";

var seatLockSchema = {};

seatLockSchema.refreshSeat = {
  vehicle: {
    notEmpty: true,
    matches: {
      options: ["^[a-zA-Z 0-9-_.]*$"],
      errorMessage: "Invalid Vehicle ID Characters."
    },
    errorMessage: "Empty Vehicle ID."
  },
  passengerID: {
    notEmpty: true,
    matches: {
      options: ["^[a-zA-Z 0-9-_.]*$"],
      errorMessage: "Invalid Passenger ID Characters."
    },
    errorMessage: "Empty Passenger ID."
  }
};

module.exports = seatLockSchema;
