const express = require("express");
const Train = require('../models/Train');
const fetch = require('node-fetch');
const cors = require("cors");
const app = express();
const router = express.Router();
const train_numbers = [4400, 930, 932, 5600, 520, 540, 510, 730, 4416, 720, 4422, 4424, 524, 4426, 512, 4428, 722, 542, 4430, 4432, 126, 511, 4407, 121, 541, 4409, 721, 4413, 621, 4415, 513, 4417, 543, 523, 5601, 525, 931, 731, 4427, 515, 545, 723, 529, 131, 180, 123, 130, 182, 125, 120, 133, 122, 135, 132, 127, 184, 137, 186, 124, 134, 136];

const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('yxaysfby', 'yxaysfby', '2t27aEF1m7eYM95PD8CpVOb937ZenlAf', {
    host: 'cornelius.db.elephantsql.com', // Replace with your ElephantSQL database's hostname
    port: 5432, // Default PostgreSQL port
    dialect: 'postgres',
    dialectModule: require('pg'),
    pool: {
        max: 5, // Set the maximum number of connections
    },
});


app.use(
    cors({
        origin: "*"
    })
)
const port = 9002;

router.get("/", async (req, res, next) => {
    return res.status(200).json({
        title: "Express Testing",
        message: "The app is working properly!",
    });
});

module.exports = router;

app.get('/update/:start', async (req, res) => {
    //const train_numbers = [4400, 930, 932, 5600, 520, 540, 510, 730, 4416, 720, 4422, 4424, 524, 4426, 512, 4428, 722, 542, 4430, 4432, 126, 511, 4407, 121, 541, 4409, 721, 4413, 621, 4415, 513, 4417, 543, 523, 5601, 525, 931, 731, 4427, 515, 545, 723, 529, 131, 180, 123, 130, 182, 125, 120, 133, 122, 135, 132, 127, 184, 137, 186, 124, 134, 136];
    const currentDate = new Date().toISOString().split('T')[0];
    const start = parseInt(req.params.start);
    for (const trainNumber of train_numbers.slice(start, start + 5)) {
        console.log(trainNumber);
        try {

            // Use backticks for string interpolation
            const url = `https://www.infraestruturasdeportugal.pt/negocios-e-servicos/horarios-ncombio/${trainNumber}/${currentDate}`;

            const response = await fetch(url);
            if (!response.ok) {
                //throw new Error('Network response was not ok');
                console.log("bad response");
                continue;
            }
            const data = await response.json();

            if (data.response.NodesPassagemComboio.DataHoraOrigem === null || data.response.NodesPassagemComboio.SituacaoComboio === "SUPRIMIDO") {
                //return res.status(500).json({ error: 'Comboio não se realiza ou foi suprimido' });
                console.log("sup/nao r")
                continue;
            }

             // Create the dynamic table name based on number and date
             const tableName = `${trainNumber}-${currentDate}`;

             // Find an existing record with the same tableName
             const existingTrain = await Train.findOne({
                where: { tableName },
            });
            console.log("exist check");
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
                continue;
            } else {
                // Create a new record in the dynamic table
                const newTrain = await Train.create({
                    tableName,
                    name: data.response.Origem + ' to ' + data.response.Destino,
                    departureTime: data.response.DataHoraOrigem,
                    arrivalTime: data.response.DataHoraDestino,
                    stationsData: processStationData(data.response.NodesPassagemComboio),
                });
                continue;
            }
        }
        catch (error) {
            console.log("error occured");
            continue;
        }
    }
    return res.json('{hello ive been trying to reach you about your cars extended warranty');
});


app.get('/:trainnumber/:date', async (req, res) => {
    //const train_numbers = [4400, 930, 932, 5600, 520, 540, 510, 730, 4416, 720, 4422, 4424, 524, 4426, 512, 4428, 722, 542, 4430, 4432, 126, 511, 4407, 121, 541, 4409, 721, 4413, 621, 4415, 513, 4417, 543, 523, 5601, 525, 931, 731, 4427, 515, 545, 723, 529, 131, 180, 123, 130, 182, 125, 120, 133, 122, 135, 132, 127, 184, 137, 186, 124, 134, 136];

    try {
        const trainNumber = req.params.trainnumber; // Extract the train number from the URL
        if(!train_numbers.includes(parseInt(trainNumber))){
            return res.status(500).json({ error: 'nao damos track a esse comboio :c (server)' });
        }
        const date = req.params.date; // Extract the date from the URL

        // Parse the date string from the URL to a Date object
        const urlDate = new Date(date);
        // Get the current date
        const currentDate = new Date();
        // Create new Date objects with only year, month, and day for comparison
        const urlDateOnly = new Date(urlDate.getFullYear(), urlDate.getMonth(), urlDate.getDate());
        const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        // Compare the dates
        //if (urlDateOnly > currentDateOnly) {
        //   return res.status(500).json({ error: 'Infelizmente a nossa máquina do tempo avariou, tenta mais tarde.' });
        //}
        if (urlDate.getFullYear() > currentDate.getFullYear()) {
            return res.status(500).json({ error: 'Infelizmente a nossa máquina do tempo avariou, tenta mais tarde. (ano)' });
        }
        else if (urlDate.getFullYear() === currentDate.getFullYear() && urlDate.getMonth() > currentDate.getMonth()) {
            return res.status(500).json({ error: 'Infelizmente a nossa máquina do tempo avariou, tenta mais tarde. (mes)' });
        }
        else if (urlDate.getFullYear() === currentDate.getFullYear() && urlDate.getMonth() === currentDate.getMonth() && urlDate.getDay() > currentDate.getDay()) {
            return res.status(500).json({ error: 'Infelizmente a nossa máquina do tempo avariou, tenta mais tarde. (dia)' });
        }


        // Create the dynamic table name based on number and date
        const tableName = `${trainNumber}-${date}`;

        // Find an existing record with the same tableName
        const existingTrain = await Train.findOne({
            where: { tableName },
        });

        if (urlDateOnly < currentDateOnly && !existingTrain) {
            return res.status(500).json({ error: 'Não temos dados para essa data :(' });
        }

        // Use backticks for string interpolation
        const url = `https://www.infraestruturasdeportugal.pt/negocios-e-servicos/horarios-ncombio/${trainNumber}/${date}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        if (data.response.NodesPassagemComboio.DataHoraOrigem === null || data.response.NodesPassagemComboio.SituacaoComboio === "SUPRIMIDO") {
            return res.status(500).json({ error: 'Comboio não se realiza ou foi suprimido' });
        }


        // Use Sequelize to find all trains with tableName starting with trainNumber
        const trainsWithTrainNumber = await Train.findAll({
            where: {
                tableName: {
                    [Sequelize.Op.startsWith]: `${trainNumber}-`,
                },
            },
        });

        // Calculate delays for each train and store them in an array
        const delaysArray = [];
        for (const train of trainsWithTrainNumber) {
            const delays = await calculateDelaysForTrain(train);
            delaysArray.push(delays);
        }

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
            const combinedResponse = {
                ...existingTrain.toJSON(), // Convert existingTrain to JSON if needed
                delaysArray,
            };
            return res.json(combinedResponse);
        } else {
            // Create a new record in the dynamic table
            const newTrain = await Train.create({
                tableName,
                name: data.response.Origem + ' to ' + data.response.Destino,
                departureTime: data.response.DataHoraOrigem,
                arrivalTime: data.response.DataHoraDestino,
                stationsData: processStationData(data.response.NodesPassagemComboio),
            });
            const combinedResponse = {
                ...newTrain.toJSON(), // Convert existingTrain to JSON if needed
                delaysArray,
            };
            return res.json(combinedResponse);
        }
    } catch (error) {
        console.error('Error fetching and inserting train data:', error);
        return res.status(500).json({ error: 'Internal server error' });
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
        if (existingStationIndex === -1) {
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

// Define a function to calculate delays for a given train
async function calculateDelaysForTrain(train) {
    const delays = {};
    const tableNameParts = train.tableName.split('-');
    const date = tableNameParts[1] + '-' + tableNameParts[2] + '-' + tableNameParts[3];

    // Initialize delays[date] array with zeros
    delays[date] = new Array(train.stationsData.length).fill(0);

    // Calculate delays for each station
    train.stationsData.forEach((station, index) => {
        const scheduledTimeParts = station.ScheduledTime.split(':');
        const arrivalTimeParts = station.ArrivalTime.split(':');

        const scheduledHours = parseInt(scheduledTimeParts[0], 10);
        const scheduledMinutes = parseInt(scheduledTimeParts[1], 10);

        const arrivalHours = parseInt(arrivalTimeParts[0], 10);
        const arrivalMinutes = parseInt(arrivalTimeParts[1], 10);

        // Calculate delay in minutes
        const delay = (arrivalHours - scheduledHours) * 60 + (arrivalMinutes - scheduledMinutes);

        // Update the delay in the delays[date] array
        delays[date][index] = delay;
    });

    return { delays };
}