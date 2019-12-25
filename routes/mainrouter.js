"use strict";

const express = require('express'),
    admin = require('firebase-admin'),
    path = require('path'),
    mainRoute = express.Router(),
    singleEntitySchema = require('../validator/singleEntityValidationSchema'),
    formValidationSchema = require('../validator/contactformvalidationschema');

const dB = admin.firestore();
//Returns the Webpage of the Company.
mainRoute.get('/', function (req, res) {
    res.status(200).sendFile('home.html', { root: path.join(__dirname, '../webpages/views/') })
});


//Route to save the user's Questionnaire form.
mainRoute.post('/getInTouch', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    req.checkBody(formValidationSchema);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    return await dB.collection('GETINTOUCH').add(req.body).then(() => {
        res.status(201).json({ message: "Thankyou for your valuable feedback", status: "OK" });
    }).catch(() => {
        res.status(403).json({ message: "Error Occured connecting to client" });
    });
});


//This route returns all the available vehicles for a given day. Based on the current time of the vehicle,
//between two selected stations.
mainRoute.post('/getVehicles', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    req.checkBody(singleEntitySchema.isValidSources);
    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json({ message: errors[0].msg });
    }

    return await dB.collection('Vehicles').get().then((snapshot) => {
        let allVehicle = [];
        snapshot.forEach(doc => {
            let date = new Date();
            let indicator = 1;
            let cTime = Number((date.getHours() + 5) * 60) + Number(date.getMinutes() + 30);
            let vTime = doc.data().currentTime.split(':');
            let dTime = (Number(vTime[0]) * 60) + Number(vTime[1]);
            if (doc.data().currentStatus != "UNAVAILABLE" && dTime > cTime) {
                let stationList = [];
                stationList = doc.data().currentStops;
                let sourcePt;
                let destinationPt;
                for (let i = 0; i < stationList.length; i++) {
                    if (req.body.source.toLowerCase().includes(stationList[i].toLowerCase())) {
                        sourcePt = i;
                    }

                    if (req.body.destination.toLowerCase().includes(stationList[i].toLowerCase())) {
                        destinationPt = i;
                    }

                    if (sourcePt != null && destinationPt != null && sourcePt < destinationPt) {
                        indicator = 0;
                        break;
                    }
                }

                if (indicator == 0) {
                    allVehicle.push(
                        {
                            "docID": doc.id,
                            "vehicleData": doc.data()
                        }
                    );
                }
            }
        });
        return res.status(200).json({ message: "STATUS OK", data: allVehicle });
    }).catch(() => {
        res.status(404).json({ message: "No found vehicle" });
    })
});

//This route returns the apiKey used in the application.
mainRoute.post('/getApiKey', async function (req, res) {
    if (req.method !== "POST") {
        return res.status(400).json({ message: "Bad Request" });
    }

    if (req.body.API_KEY != "API_KEY") {
        return res.status(401).json({ message: "Unauthorized" });
    }

    return dB.collection('Admin').doc('apiKey').get().then((doc) => {
        if (doc.exists) {
            res.status(200).json({ message: "OK", API_KEY: doc.data() });
        } else {
            res.status(404).json({ message: "No Key Found" });
        }
    }).catch(() => {
        res.status(404).json({ message: "No Key Found" });
    });
});

module.exports = mainRoute;