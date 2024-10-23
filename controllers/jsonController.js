const fs = require('fs');
const path = require('path');

// Get path to the JSON file
const dataFilePath = path.join(__dirname, '../json/new.json');

// Read JSON file
const readJSONFile = () => {
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(data);
};

// Write to JSON file
const writeJSONFile = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
};

// Controller to get all data
exports.getAllData = (req, res) => {
    try {
        const data = readJSONFile();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error reading data' });
    }
};
exports.getData = () => {
    try {
        const data = readJSONFile();
        res.json(data);
    } catch (error) {
        return false;
    }
};

// Controller to add new data
exports.addData = (req, res) => {
    try {
        const newData = req.body; // Get data from API request body
        if (!newData.bot_id || !newData.type || !newData.baseOrder || !newData.orderType || newData.limitOrderTargetPercentage === undefined) {
            return res.status(400).json({ message: 'Invalid data' });
        }
        const data = readJSONFile(); // Read existing data
        data.push(newData); // Push new data to the array
        writeJSONFile(data); // Write the updated data back to the file

        res.status(201).json({ message: 'Data added successfully', data: newData });
    } catch (error) {
        res.status(500).json({ message: 'Error writing data' });
    }
};
