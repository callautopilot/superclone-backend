"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const sdk_1 = require("@deepgram/sdk");
const dotenv_1 = __importDefault(require("dotenv"));
const ws_1 = require("ws");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT;
const wss = new ws_1.WebSocket.Server({ port: 1338 });
const deepgramClient = (0, sdk_1.createClient)(process.env.DEEPGRAM_API_KEY);
const url = "https://icecast.radiofrance.fr/franceinter-midfi.mp3";
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html'); // Serve your client webpage here
});
wss.on('connection', (ws) => {
    console.log('Client connected');
    const connection = deepgramClient.listen.live({
        punctuate: true,
        smart_format: true,
        model: "nova",
    });
    let keepAlive = setInterval(() => {
        console.log("deepgram: keepalive");
        connection.keepAlive();
    }, 10 * 1000);
    connection.on(sdk_1.LiveTranscriptionEvents.Open, () => {
        connection.on(sdk_1.LiveTranscriptionEvents.Close, () => {
            console.log("Connection closed.");
        });
        connection.on(sdk_1.LiveTranscriptionEvents.Metadata, (data) => {
            console.log(data);
        });
        connection.on(sdk_1.LiveTranscriptionEvents.Transcript, (data) => {
            console.log(data);
        });
        (0, node_fetch_1.default)(url)
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
        if (connection)
            connection.finish();
    });
});
app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
//# sourceMappingURL=app.js.map