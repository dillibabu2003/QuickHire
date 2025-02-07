import http from "http";
import SocketManager from "./SocketManager.js";
const server = http.createServer();

import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ server: server });

const socketManager = new SocketManager();
wss.on('connection', function connection(ws) {
    socketManager.addClient(ws);  
});
server.listen(8888,()=>{
    console.log("Websocket listening on 8888");
})