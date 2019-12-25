"use strict";

const admin = require('firebase-admin');

var writeDefaultPayment = {};
writeDefaultPayment.writePayment = async function (driverID, paymentAmount) {
    await admin.firestore().collection('DefaultPayment').doc(driverID).get().then((doc) => {
        if (doc.exists) {
            let defaultPayment = doc.data().paymentAmount;
            defaultPayment = Number(defaultPayment) + Number(0.3 * paymentAmount);
            let payment = {
                "paymentAmount": defaultPayment
            }
            return admin.firestore().collection('DefaultPayment').doc(driverID).update(payment).then(() => {
                return null;
            }).catch(() => {
                return null;
            });
        } else {
            let payment = {
                "paymentAmount": Number(0.3 * paymentAmount)
            }
            return admin.firestore().collection('DefaultPayment').doc(driverID).set(payment).then(() => {
                return null;
            }).catch(() => {
                return null;
            });
        }
    }).catch(() => {
        return null;
    });
}

module.exports = writeDefaultPayment;