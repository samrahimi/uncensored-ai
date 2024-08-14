const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = 1207;

app.get('/run-pipeline', (req, res) => {
  const { model, prompt } = req.query;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const child = spawn('node', ['run.js', model, prompt], {
    env: {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY
    }
  });

  child.stdout.on('data', (data) => {
    res.write(`data: ${data}\n\n`);
  });

  child.stderr.on('data', (data) => {
    res.write(`data: ERROR: ${data}\n\n`);
  });

  child.on('close', (code) => {
    res.write(`data: Process exited with code ${code}\n\n`);
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

