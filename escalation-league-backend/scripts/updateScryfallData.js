const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');

const BULK_DATA_URL = 'https://api.scryfall.com/bulk-data';
const JSON_FILE_PATH = path.join(__dirname, 'default-cards.json'); // Temporary file path for the JSON

const fetchBulkData = async () => {
    try {
        console.log('Fetching bulk data metadata from Scryfall...');
        const response = await axios.get(BULK_DATA_URL);
        const bulkData = response.data;

        // Find the "default_cards" bulk data
        const defaultCardsData = bulkData.data.find((item) => item.type === 'default_cards');
        if (!defaultCardsData) {
            throw new Error('Default Cards bulk data not found.');
        }

        console.log(`Found Default Cards bulk data. Last updated: ${defaultCardsData.updated_at}`);
        console.log(`Downloading JSON from: ${defaultCardsData.download_uri}`);

        // Download the JSON file
        const downloadResponse = await axios.get(defaultCardsData.download_uri, { responseType: 'stream' });
        const writer = fs.createWriteStream(JSON_FILE_PATH);

        downloadResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('Download complete.');
                resolve();
            });
            writer.on('error', (err) => {
                reject(err);
            });
        });
    } catch (error) {
        console.error('Error fetching bulk data:', error.message);
        throw error;
    }
};

const runImportScript = async () => {
    try {
        console.log('Running the import script...');
        await new Promise((resolve, reject) => {
            exec(`node importOracleCards.js ${JSON_FILE_PATH}`, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error running import script:', stderr);
                    reject(error);
                } else {
                    console.log(stdout);
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('Error during import:', error.message);
        throw error;
    }
};

const cleanup = () => {
    try {
        if (fs.existsSync(JSON_FILE_PATH)) {
            fs.unlinkSync(JSON_FILE_PATH);
            console.log('Temporary JSON file deleted.');
        }
    } catch (error) {
        console.error('Error deleting temporary JSON file:', error.message);
    }
};

const updateScryfallData = async () => {
    try {
        await fetchBulkData();
        await runImportScript();
        cleanup();
        console.log('Scryfall data update completed successfully!');
    } catch (error) {
        console.error('Scryfall data update failed:', error.message);
    }
};

updateScryfallData();