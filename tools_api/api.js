const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 8888;

// Middleware to parse JSON request bodies
app.use(express.json());

// Define your API key here
const api_key = 'SG_e14973ea33d410f1';
const apiUrl = 'https://api.segmind.com/v1/flux-pro';

app.post('/generate-image', async (req, res) => {
  try {
    const reqBody = req.body;

    const formData = new FormData();
    
    // Append regular fields from the request body
    for (const key in reqBody) {
      if (reqBody.hasOwnProperty(key)) {
        formData.append(key, reqBody[key]);
      }
    }

    // Make the API request
    const response = await axios.post(apiUrl, formData, {
      headers: {
        'x-api-key': api_key,
        ...formData.getHeaders()
      },
    });

    // Generate a unique filename
    const filename = `${uuidv4()}.png`;
    const savePath = path.join('../public', filename);

    // Save the image
    fs.writeFileSync(savePath, response.data);

    // Return the URL to the client
    res.json({ url: `http://localhost:${PORT}/public/${filename}` });

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).send('An error occurred while generating the image.');
  }
});

// Serve static files from the public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
