// import express from "express";
// const app =  express();
import ws from "ws";
import http from "http";
import SocketManager from "./SocketManager.js";
// const server = http.createServer(app);

import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

const socketManager = new SocketManager();
wss.on('connection', function connection(ws) {
    socketManager.addClient(ws);
  
});