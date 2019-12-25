"use strict";

var singleEntityValidationSchema = {};
singleEntityValidationSchema.isValidOTP = {
    "OTP": {
        notEmpty: true,
        isNumeric: true,
        isLength: {
            options: [{ max: 4, min: 4 }],
            errorMessage: "Invalid OTP."
        },
        errorMessage: 'Invalid OTP.'
    },
    "vehicle": {
        notEmpty: true,
        matches: {
            options: ["^[a-zA-Z 0-9\-\_\.]*$"],
            errorMessage: "Invalid Vehicle ID Characters."
        },
        errorMessage: "Empty Vehicle ID."
    }
}

singleEntityValidationSchema.isValidCabStatus = {
    "status": {
        notEmpty: true,
        isAlpha: true,
        in: 'body',
        matches: {
            options: [/\b(?:ACCEPTED|DECLINED|CANCELLED)\b/],
            errorMessage: "Invalid Status."
        },
        errorMessage: "Enter Status."
    },
    "ticket": {
        notEmpty: true,
        matches: {
            options: ["^[a-zA-Z 0-9\-\_\.]*$"],
            errorMessage: "Invalid Vehicle ID Characters."
        },
        errorMessage: "Empty Vehicle ID."
    }
}

singleEntityValidationSchema.isValidSources = {
    "source": {
        notEmpty: true,
        errorMessage: "Empty Source Station."
    },
    "destination": {
        notEmpty: true,
        errorMessage: "Empty Destination Station."
    }
}

singleEntityValidationSchema.isValidStatus = {
    "status": {
        notEmpty: true,
        isAlpha: true,
        in: 'body',
        matches: {
            options: [/\b(?:AVAILABLE|UNAVAILABLE|STARTED)\b/],
            errorMessage: "Invalid Status."
        },
        errorMessage: "Invalid Status."
    },
    "vehicle": {
        notEmpty: true,
        matches: {
            options: ["^[a-zA-Z 0-9\-\_\.]*$"],
            errorMessage: "Invalid Vehicle ID Characters."
        },
        errorMessage: "Empty Vehicle ID."
    }
}

singleEntityValidationSchema.isValidEmail = {
    "email": {
        notEmpty: true,
        isEmail: true,
        errorMessage: "Invalid Email Address."
    }
}

singleEntityValidationSchema.isValidPassword = {
    "password": {
        notEmpty: true,
        matches: {
            options: ["^[a-zA-Z 0-9\@\#\$\&\_]*$"],
            errorMessage: "Invalid Password Characters."
        },
        isLength: {
            options: [{ min: 10 }],
            errorMessage: " Password must be at least 10 characters."
        },
        errorMessage: "Invalid Password."
    }
}

module.exports = singleEntityValidationSchema;