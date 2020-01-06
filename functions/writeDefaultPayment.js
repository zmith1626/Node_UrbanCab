"use strict";

const admin = require("firebase-admin");

//Database Invocation
const dB = admin.firestore();
const DefaultPayment = dB.collection("DefaultPayment");

var writeDefaultPayment = {};
writeDefaultPayment.writePayment = async function(driverID, paymentAmount) {
  await DefaultPayment.doc(driverID)
    .get()
    .then(doc => {
      if (doc.exists) {
        let defaultPayment = doc.data().paymentAmount;
        defaultPayment = Number(defaultPayment) + Number(0.3 * paymentAmount);
        let payment = {
          paymentAmount: defaultPayment
        };
        return defaultPayment
          .doc(driverID)
          .update(payment)
          .then(() => {
            return null;
          })
          .catch(() => {
            return null;
          });
      } else {
        let payment = {
          paymentAmount: Number(0.3 * paymentAmount)
        };
        return DefaultPayment.doc(driverID)
          .set(payment)
          .then(() => {
            return null;
          })
          .catch(() => {
            return null;
          });
      }
    })
    .catch(() => {
      return null;
    });
};

module.exports = writeDefaultPayment;
