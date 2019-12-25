"use strict";

const admin = require('firebase-admin');

async function writeTicket(vehicleId, passengerId) {
    await admin.firestore().collection('Vehicles').doc(vehicleId).get().then((doc) => {
        if (doc.exists) {
            let passengerList = [];
            let index = 0;
            passengerList = doc.data().passenger;
            for (let i = 0; i < passengerList.length; i++) {
                if (passengerList[i].passengerID == passengerId) {
                    index = i;
                    break;
                }
            }
            var passenger = passengerList[index];
            let ticketData = {
                "OTP": passenger.OTP,
                "compPrice": passenger.compPrice,
                "contact": passenger.contact,
                "drop": passenger.drop,
                "passengerID": passengerId,
                "passengerName": passenger.passengerName,
                "photo": passenger.photo,
                "pickup": passenger.pickup,
                "price": passenger.price,
                "status": "COMPLETED",
                "date": passenger.date,
                "assignedVehicle": {
                    "driver": doc.data().driver,
                    "model": doc.data().model,
                    "registration": vehicleId
                }
            }

            return admin.firestore().collection('Tickets').add(ticketData).then().catch();
        }
    }).catch();
}

module.exports = writeTicket;