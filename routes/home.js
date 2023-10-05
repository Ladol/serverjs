const express = require("express");
const Train = require('../models/Train');
const fetch = require('node-fetch');
const cors = require("cors");
const app = express();
const router = express.Router();

const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('yxaysfby', 'yxaysfby', '2t27aEF1m7eYM95PD8CpVOb937ZenlAf', {
    host: 'cornelius.db.elephantsql.com', // Replace with your ElephantSQL database's hostname
    port: 5432, // Default PostgreSQL port
    dialect: 'postgres',
    dialectModule: require('pg'),
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


app.get('/:trainnumber/:date', async (req, res) => {
    try {
        const trainNumber = req.params.trainnumber; // Extract the train number from the URL
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
        if(urlDate.getFullYear() > currentDate.getFullYear()){
            return res.status(500).json({ error: 'Infelizmente a nossa máquina do tempo avariou, tenta mais tarde. (ano)' });
        }
        else if(urlDate.getFullYear() === currentDate.getFullYear() && urlDate.getMonth() > currentDate.getMonth()){
            return res.status(500).json({ error: 'Infelizmente a nossa máquina do tempo avariou, tenta mais tarde. (mes)' });
        }
        else if(urlDate.getFullYear() === currentDate.getFullYear() && urlDate.getMonth() === currentDate.getMonth() && urlDate.getDay() > currentDate.getDay()){
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

        if (data.response.NodesPassagemComboio.DataHoraOrigem === null || data.response.NodesPassagemComboio.SituacaoComboio === "SUPRIMIDO"){
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
                ...tableName.toJSON(), // Convert existingTrain to JSON if needed
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