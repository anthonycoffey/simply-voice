# Simply Voice Backend

Express.js backend for Speech-to-Text API


## API Endpoints

### GET /api/tts/voices

Returns the best English US voice models.

**Response:**
- `200 OK`: A list of voice models.
- `500 Internal Server Error`: Failed to fetch voices.

**Example Response:**
```json
[
  {
    "id": "en-US-Wavenet-D",
    "name": "Wavenet-D",
    "lang": "en-US",
    "ssmlGender": "MALE",
    "naturalSampleRateHertz": 24000,
  },
  ...
]
```

### POST /api/tts/synthesize

Converts text to speech.

**Request Body:**
- `text` (string, required): The text to be converted to speech.
- `voiceId` (string, required): The ID of the voice to use.
- `speakingRate` (number, optional): The speaking rate (default is 1.0).
- `pitch` (number, optional): The pitch (default is 0.0).
- `lang` (string, optional): The language code (default is `en-US`).

**Response:**
- `200 OK`: The synthesized speech audio file.
- `400 Bad Request`: Missing required parameters.
- `500 Internal Server Error`: Failed to synthesize speech.

**Example Request:**
```json
{
  "text": "Hello, world!",
  "voiceId": "en-US-Wavenet-D",
  "lang": "en-US",
  "speakingRate": 1.0,
  "pitch": 0.0
}
```

**Example Response:**
- Audio file in WAV format.