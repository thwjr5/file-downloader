// file-downloader/app.js
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const winston = require('winston');
const { promises: fsPromises } = require('fs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Create logs directory if it doesn't exist
(async () => {
  try {
    await fsPromises.mkdir('logs', { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
})();

// Middleware
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Download endpoint
app.post('/download', async (req, res) => {
  const { url, destination } = req.body;

  // Validate input
  if (!url || !destination) {
    return res.status(400).json({ error: 'URL and destination are required' });
  }

  // Validate destination path to prevent directory traversal attacks
  // Allow paths to start with /downloads to ensure files go to the mounted volume
  let normalizedPath = path.normalize(destination);
  if (normalizedPath.includes('..')) {
    return res.status(400).json({ error: 'Invalid destination path' });
  }
  
  // If path doesn't start with /downloads, prepend it
  if (!normalizedPath.startsWith('/downloads/') && !normalizedPath.startsWith('/downloads')) {
    normalizedPath = path.join('/downloads', normalizedPath);
  }

  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(normalizedPath);
    await fsPromises.mkdir(dir, { recursive: true });

    // Download file
    logger.info(`Starting download from ${url} to ${normalizedPath}`);
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    // Get filename from URL if not provided in destination
    let filePath = normalizedPath;
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
      const fileName = path.basename(new URL(url).pathname) || 'downloaded_file';
      filePath = path.join(filePath, fileName);
    }

    // Save file
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        logger.info(`Successfully downloaded file to ${filePath}`);
        res.status(200).json({ 
          status: 'success', 
          message: 'File downloaded successfully',
          filePath: filePath
        });
        resolve();
      });
      writer.on('error', (error) => {
        logger.error(`Error writing file: ${error.message}`);
        res.status(500).json({ error: `Failed to save file: ${error.message}` });
        reject(error);
      });
    });
  } catch (error) {
    logger.error(`Download failed: ${error.message}`);
    res.status(500).json({ error: `Download failed: ${error.message}` });
  }
});

// Multiple download endpoint
app.post('/batch-download', async (req, res) => {
  const { downloads } = req.body;

  if (!downloads || !Array.isArray(downloads) || downloads.length === 0) {
    return res.status(400).json({ error: 'Valid downloads array is required' });
  }

  const results = [];
  const errors = [];

  for (const item of downloads) {
    const { url, destination } = item;
    
    if (!url || !destination) {
      errors.push({ url, destination, error: 'URL and destination are required' });
      continue;
    }

    // Validate destination path
    // Allow paths to start with /downloads to ensure files go to the mounted volume
    let normalizedPath = path.normalize(destination);
    if (normalizedPath.includes('..')) {
      errors.push({ url, destination, error: 'Invalid destination path' });
      continue;
    }
    
    // If path doesn't start with /downloads, prepend it
    if (!normalizedPath.startsWith('/downloads/') && !normalizedPath.startsWith('/downloads')) {
      normalizedPath = path.join('/downloads', normalizedPath);
    }

    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(normalizedPath);
      await fsPromises.mkdir(dir, { recursive: true });

      // Download file
      logger.info(`Starting download from ${url} to ${normalizedPath}`);
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });

      // Get filename from URL if not provided in destination
      let filePath = normalizedPath;
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
        const fileName = path.basename(new URL(url).pathname) || 'downloaded_file';
        filePath = path.join(filePath, fileName);
      }

      // Save file
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      logger.info(`Successfully downloaded file to ${filePath}`);
      results.push({ url, filePath, status: 'success' });
    } catch (error) {
      logger.error(`Download failed for ${url}: ${error.message}`);
      errors.push({ url, destination, error: error.message });
    }
  }

  res.status(errors.length > 0 && results.length === 0 ? 500 : 200).json({
    status: errors.length > 0 ? (results.length > 0 ? 'partial' : 'failed') : 'success',
    successful: results,
    failed: errors
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});