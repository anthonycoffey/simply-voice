// app.js or server.js
const express = require('express');
const app = express();
const ttsRoutes = require('./services/tts-service');

app.use(express.json());
app.use('/api/tts', ttsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});