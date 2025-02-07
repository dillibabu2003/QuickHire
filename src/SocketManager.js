import ChildProcessExecutor from "./ChildProcessExecutor.js";
import { Client } from "./Client.js";
import { Room } from "./Room.js";
import SocketResponse from "./utils/SocketResponse.js";
import Events from "./utils/SocketEvents.js";

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
        ws.roomId=roomId;
        console.log(client.name);
        
        if (this.rooms.has(roomId)) {
            this.rooms.get(roomId).client2 = client;
            this.signalBothClients(roomId,Events.MEETING_STARTED,null,"Meeting got started.");
        }
        else {
            const newRoom = new Room(roomId);
            newRoom.client1 = client;
            this.rooms.set(roomId, newRoom);
            ws.send(JSON.stringify(new SocketResponse(Events.MEETING_CREATED, null, "Waiting for other client to connect.")))
        }
    }
    destroyRoom(roomId){
        this.rooms.delete(roomId);
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
                    ws.send(JSON.stringify(new SocketResponse(Events.INVALID_MEETING, null, "There is no meeting with given id.")));
                }
                else if (!this.rooms.get(data.roomId).client2) {
                    ws.send(JSON.stringify(new SocketResponse(Events.MEETING_YET_TO_START, null, "Meeting is not yet started.")));
                }
                else{
                    this.handleCodeExecution(data);
                }
            }
        });
        ws.on('error', console.error);
        ws.on('close',()=>{
            console.log("Socket Disconnected.");            
            if(!this.rooms.has(ws.roomId)) return;
            const {client1,client2} = this.rooms.get(ws.roomId);
            if(client1?.socket==ws){
                client2?.socket.send(JSON.stringify(new SocketResponse(Events.LEFT, null, `${client1?.name} has left the meeting. This meeting will close within 30 seconds.`)));
            }
           else{
                client1?.socket.send(JSON.stringify(new SocketResponse(Events.LEFT, null, `${client2?.name} has left the meeting. This meeting will close within 30 seconds.`)));
            }
            setTimeout(()=>{
                this.destroyRoom(ws.roomId);
            },10000);
        })
        ws.send(JSON.stringify({message: 'Connected to the server.'}));
    }
    handleCodeExecution(data) {
        const { code, lang, input } = data;
        //TODO: kill the child process if timeout happens
        if (!code || !lang) {
            ws.send(JSON.stringify(new SocketResponse(Events.ERROR, null, "Code or language is missing.")));
            return;
        }
        //create child process and execute it and signal, execution is taking place.
        const room = this.rooms.get(data.roomId)
        room.code = code;
        room.lang=lang;
        room.input=""||input;
        this.signalBothClients(data.roomId,Events.EXECUTION_IN_PROGRESS,null,"Compiling the code.")
        const executor = new ChildProcessExecutor(lang, code,input);
        executor.execute()
            .then(result => {
                console.log('Output:', result.output); // Should print: 'Hello from JS!'
                console.log('Message:', result.message);

                this.signalBothClients(data.roomId,Events.EXECUTION_COMPLETED,result.output,"Compilation successfull.");
            })
            .catch(error => {
                console.error('Error:', error.message);
                this.signalBothClients(data.roomId,Events.EXECUTION_COMPLETED,result.output,"Compilation Error.");
            });
    }

}