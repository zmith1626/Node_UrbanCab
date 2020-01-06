"use strict";

var privatePassengerSchema = {};
privatePassengerSchema = {
  name: {
    notEmpty: true,
    matches: {
      options: ["^[a-zA-Z 0-9-_.]*$"],
      errorMessage: "Invalid passenger name Characters."
    },
    errorMessage: "Empty passenger Name."
  },
  phone: {
    notEmpty: true,
    isNumeric: true,
    isMobilePhone: true,
    isLength: {
      options: [{ max: 10, min: 10 }],
      errorMessage: "Invalid Phone."
    },
    errorMessage: "Invalid Phone."
  },
  photo: {
    notEmpty: true,
    isURL: true,
    errorMessage: "Invalid Photo Url."
  },
  pickPosition: {
    notEmpty: true,
    errorMessage: "Invalid source Position."
  },
  dropPosition: {
    notEmpty: true,
    errorMessage: "Invalid drop Position."
  },
  price: {
    notEmpty: true,
    isNumeric: true,
    errorMessage: "Invalid Price details."
  },
  compPrice: {
    isNumeric: true,
    errorMessage: "Invalid Compensation price."
  },
  date: {
    notEmpty: true,
    matches: {
      options: ["^[0-9-]*$"],
      errorMessage: "Invalid Date Format."
    },
    errorMessage: "Empty Date."
  },
  vehicle1: {
    notEmpty: true,
    matches: {
      options: ["^[a-zA-Z 0-9-_.]*$"],
      errorMessage: "Invalid Vehicle ID Characters."
    },
    errorMessage: "Empty Vehicle ID."
  },
  vehicle2: {
    notEmpty: true,
    matches: {
      options: ["^[a-zA-Z 0-9-_.]*$"],
      errorMessage: "Invalid Vehicle ID Characters."
    },
    errorMessage: "Empty Vehicle ID."
  },
  vehicle3: {
    notEmpty: true,
    matches: {
      options: ["^[a-zA-Z 0-9-_.]*$"],
      errorMessage: "Invalid Vehicle ID Characters."
    },
    errorMessage: "Empty Vehicle ID."
  }
};

module.exports = privatePassengerSchema;
