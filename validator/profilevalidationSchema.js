"use strict";

var profileValidationSchema = {};
profileValidationSchema.isValidProfileData = {
  fName: {
    notEmpty: true,
    matches: {
      options: ["^[a-zA-Z 0-9-_.]*$"],
      errorMessage: "Invalid first name Characters."
    },
    errorMessage: "Empty First Name."
  },
  lName: {
    notEmpty: true,
    matches: {
      options: ["^[a-zA-Z 0-9-_.]*$"],
      errorMessage: "Invalid last name Characters."
    },
    errorMessage: "Empty last Name."
  },
  email: {
    notEmpty: true,
    isEmail: true,
    errorMessage: "Invalid Email Address."
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
  photoPath: {
    matches: {
      options: ["^[a-zA-Z 0-9/._-]*$"]
    },
    errorMessage: "Invalid photoPath."
  }
};

module.exports = profileValidationSchema;
