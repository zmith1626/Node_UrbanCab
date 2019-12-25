"use strict";

var contactFormValidationSchema = {};
contactFormValidationSchema = {
    "fName": {
        notEmpty: true,
        matches: {
            options: ["^[a-zA-Z 0-9\.]*$"],
            errorMessage: "Invalid First Name Characters."
        },
        errorMessage: "Enter First name."
    },
    "lName": {
        notEmpty: true,
        matches: {
            options: ["^[a-zA-Z 0-9\.]*$"],
            errorMessage: "Invalid Last Name Characters."
        },
        errorMessage: "Enter Last name."
    },
    "eAddress": {
        notEmpty: true,
        isEmail: true,
        errorMessage: "Invalid Email Address."
    },
    "phone": {
        notEmpty: true,
        isNumeric: true,
        isMobilePhone: true,
        isLength: {
            options: [{ max: 10, min: 10 }],
            errorMessage: "Invalid Phone."
        },
        errorMessage: 'Invalid Phone.'
    },
    "subject": {
        notEmpty: true,
        isAlpha: true,
        in: 'body',
        matches: {
            options: [/\b(?:INF|CAB|FS|OTHERS)\b/],
            errorMessage: "Invalid Subject."
        },
        errorMessage: "Enter Subject."
    },
    "msg": {
        notEmpty: true,
        matches: {
            options: ["^[a-zA-Z 0-9\-\,\.]*$"],
            errorMessage: "Invalid Message Characters."
        },
        errorMessage: "Empty Message."
    }
}

module.exports = contactFormValidationSchema;