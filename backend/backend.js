const express = require('express');
const app = express();
const port = 5000;
const sqlite3 = require('sqlite3').verbose();

const cors = require('cors');

app.use(express.json());
app.use(cors());

const db = new sqlite3.Database('./weather.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS weather (id INTEGER PRIMARY KEY AUTOINCREMENT, 
        city TEXT, countryCode TEXT, temperature REAL, humidity REAL, description TEXT, startDate DATE, endDate DATE)`
    );
});


app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the Weather App API!' });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:5000`);
})


// set up crud operations (Create, Read, Update, Delete) for the weather table

app.post('/api/weather', (req, res) => {
    const { city, countryCode, temperature, humidity, description, startDate, endDate} = req.body;
    db.run(`INSERT INTO weather (city, countryCode, temperature, humidity, description, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [city, countryCode, temperature, humidity, description, startDate, endDate], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID });
        });
});


app.get('/api/weather', (req, res) => {

    const loc = req.query.loc;

    const query = `SELECT * FROM weather`;
    let params = [];
    
    if(loc){
        query += ` WHERE city = ?`;
        params.push(loc);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});


//I want to update the weather table based on the city and countryCode and change ONLY the humidity:
app.put('/api/weather/', (req, res) => {
    const { city, countryCode, humidity } = req.body;

    if (!city || !countryCode || !humidity) {
        return res.status(400).json({ error: "City, countryCode and humidity are required" });
    }

    const sql = `UPDATE weather SET humidity = ? WHERE LOWER(city) = LOWER(?) AND LOWER(countryCode) = LOWER(?)`;
    const params = [humidity, city, countryCode];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'No matching record found to update' });
        }
        res.json({ message: 'Weather updated successfully' });
    });
});




app.delete('/api/weather', (req, res) => {
    const { city, countryCode } = req.body;

    if (!city || !countryCode) {
      return res.status(400).json({ error: "City and countryCode are required" });
    }

    const sql = `DELETE FROM weather WHERE LOWER(city) = LOWER(?) AND LOWER(countryCode) = LOWER(?)`;
    const params = [city, countryCode];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'No matching record found to delete' });
        }
        res.json({ message: 'Weather deleted successfully' });
    });
});









