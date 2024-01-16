import express from 'express';
import fetch from "node-fetch";
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';

dotenv.config();
const app = express();
const port = process.env.PORT;
const wss = new WebSocket.Server({ port: 1338 });

const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
// const url = "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service_americas";
const url = "https://icecast.radiofrance.fr/franceinter-midfi.mp3";

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html'); // Serve your client webpage here
});

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  const connection = deepgramClient.listen.live({
    punctuate: false,
    smart_format: false,
    model: "nova-2",
    language: "fr",
  });

  let keepAlive = setInterval(() => {
    // console.log("deepgram: keepalive");
    connection.keepAlive();
  }, 10 * 1000);

  connection.on(LiveTranscriptionEvents.Open, () => {
    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("Connection closed.");
      clearInterval(keepAlive);
      if (connection) connection.finish();
    });

    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log(data);
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript
      console.log(transcript);
      ws.send(JSON.stringify(data));
    });

    fetch(url)
      .then(response => {
        const stream = response.body;
        stream.on("readable", () => {
          const chunk = stream.read();
          if (chunk) {
            connection.send(chunk);
          }
        });
      })
      .catch(error => {
        console.error('Error fetching audio stream:', error);
      });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(keepAlive);
    if (connection) connection.finish();
  });
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
