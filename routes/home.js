const express = require("express");
const Train = require('../models/Train');
const fetch = require('node-fetch');
const cors = require("cors");
const app = express();
const router = express.Router();

router.get("/", async (req, res, next) => {
  return res.status(200).json({
    title: "Express Testing",
    message: "The app is working properly!",
  });
});

module.exports = router;

const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('master', 'postgres', '2GPU1haRPLWBT', {
    host: 'localhost',
    dialect: 'postgres',
    dialectModule: require('pg')
});


app.use(
    cors({
        origin: "*"
    })
)
const port = 9001;
//

app.get('/train-data', async (req, res) => {
    try {
        const response = await fetch('https://www.infraestruturasdeportugal.pt/negocios-e-servicos/horarios-ncombio/4422/2023-10-05');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        // Create the dynamic table name based on number and date
        const tableName = `${'4422'}-${'2023-10-05'}`;

        // Find an existing record with the same tableName
        const existingTrain = await Train.findOne({
            where: { tableName },
        });

        if (existingTrain) {
            const updatedStationsData = processStationData(data.response.NodesPassagemComboio, existingTrain.stationsData);
            //console.log(updatedStationsData);
            // Update the existing record with new data
            await existingTrain.update({
                name: data.response.Origem + ' to ' + data.response.Destino,
                departureTime: data.response.DataHoraOrigem,
                arrivalTime: data.response.DataHoraDestino,
                stationsData: updatedStationsData, // Explicitly set stationsData
            }, {
                fields: ['name', 'departureTime', 'arrivalTime', 'stationsData'], // Specify fields to update
            });
        } else {
            // Create a new record in the dynamic table
            await Train.create({
                tableName,
                name: data.response.Origem + ' to ' + data.response.Destino,
                departureTime: data.response.DataHoraOrigem,
                arrivalTime: data.response.DataHoraDestino,
                stationsData: processStationData(data.response.NodesPassagemComboio),
            });
        }
        //console.log(existingTrain.stationsData);

        res.json(data);
    } catch (error) {
        console.error('Error fetching and inserting train data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});


// Function to process station data
function processStationData(nodesPassagemComboio, existingStationsData = []) {
    const stationsData = [...existingStationsData];

    nodesPassagemComboio.forEach((station) => {
        const scheduledTime = station.HoraProgramada;
        const stationName = station.NomeEstacao;
        const passed = station.ComboioPassou;

        let arrivalTime = scheduledTime; // Default to scheduled time

        // If "Observacoes" is not empty, parse the arrival time
        if (station.Observacoes && station.Observacoes.startsWith('Hora Prevista:')) {
            const match = station.Observacoes.match(/(\d{2}:\d{2})$/);
            if (match) {
                arrivalTime = match[1]; // Use the extracted time
            }
        }
        //console.log(stationName);
        // Check if the station exists in the existingStationsData
        const existingStationIndex = existingStationsData.findIndex(existingData => existingData.StationName === stationName);
        if(existingStationIndex === -1){
            console.log("no data");
            stationsData.push({
                StationName: stationName,
                Passed: passed,
                ScheduledTime: scheduledTime,
                ArrivalTime: arrivalTime,
            });
        } else if (passed) {
            console.log("has passed");
            stationsData[existingStationIndex].Passed = passed;
            //console.log(existingStationData);
        } else {
            console.log("not passed");
            // Update arrivalTime for existing station data where passed is false
            stationsData[existingStationIndex].ArrivalTime = arrivalTime;
        }
    });

    return stationsData;
}
