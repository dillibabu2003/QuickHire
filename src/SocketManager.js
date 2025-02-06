import ChildProcessExecutor from "./ChildProcessExecutor.js";
import { Client } from "./Client.js";
import { Room } from "./Room.js";
import SocketResponse from "./utils/SocketResponse.js";

export default class SocketManager {
    rooms;
    constructor() {
        this.rooms = new Map();
    }
    addClient(ws) {
        this.initHandlers(ws);
    }
    joinRoom(roomId, clientName, ws) {
        const client = new Client(clientName, ws);
        if (this.rooms.has(roomId)) {
            this.rooms.get(roomId).client2 = client;
            this.signalBothClients(roomId,"started-meeting",null,"Meeting got started.");
        }
        else {
            const newRoom = new Room(roomId);
            newRoom.client1 = client;
            this.rooms.set(roomId, newRoom);
            ws.send(JSON.stringify(new SocketResponse("meeting-created", null, "Waiting for other client to connect.")))
        }
    }
    signalBothClients(roomId,eventName,output,message) {
        this.rooms.get(roomId).client1.socket.send(JSON.stringify(new SocketResponse(eventName,output,message)));
        this.rooms.get(roomId).client2.socket.send(JSON.stringify(new SocketResponse(eventName,output,message)));
    }
    initHandlers(ws) {
        ws.on('message', (data) => {
            data = JSON.parse(data.toString());
            if (data.type == "join") {
                this.joinRoom(data.roomId, data.clientName, ws);
            }
            else if (data.type == "execute") {
                //check if room is present
                if (!this.rooms.has(data.roomId)) {
                    ws.send(JSON.stringify(new SocketResponse("meeting-yet-start", null, "Meeting is not yet started.")));
                    return;
                }
                this.handleCodeExecution(data);
            }
        });
        ws.on('error', console.error);
        ws.send('Connected to the server.');
    }
    handleCodeExecution(data) {
        const { code, lang, input } = data;
        //kill the child process if timeout happens
        if (!code || !lang) {
            ws.send(new SocketResponse("error", null, "Code or language is missing."));
            return;
        }
        //create child process and execute it and signal, execution is taking place.
        const room = this.rooms.get(data.roomId)
        room.code = code;
        room.lang=lang;
        room.input=""||input;
        this.signalBothClients(data.roomId,"execution-inprogess",null,"Compiling the code.")
        const executor = new ChildProcessExecutor(lang, code,input);
        executor.execute()
            .then(result => {
                console.log('Output:', result.output); // Should print: 'Hello from JS!'
                console.log('Message:', result.message);

                this.signalBothClients(data.roomId,"execution-completed",result.output,"Compilation successfull.");
            })
            .catch(error => {
                console.error('Error:', error.message);
                this.signalBothClients(data.roomId,"execution-completed",result.output,"Compilation Error.");
            });
    }

}