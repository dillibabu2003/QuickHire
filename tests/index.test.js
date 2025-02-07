import WebSocket from "ws";
import {error, log} from "console";
import Events from "../src/utils/SocketEvents";

describe("Join and Start Meeting and Execution of Code", () => {
    let client1;
    let client2;
    let client1Messages;
    let client2Messages;
   

    async function waitForAndPopLatestMessage(clientMessages){
        return new Promise(function (resolve){
            if(clientMessages.length>0){
                resolve(clientMessages.shift()) 
            }
            else{
                setTimeout(()=>{
                    resolve(clientMessages.shift()); //waits if there are no new msgs.
                },100);
            }
        })
    }
    beforeEach(async () => {
        client1 = new WebSocket("ws://localhost:8888");
        client2 = new WebSocket("ws://localhost:8888");

        
        client1Messages=[];
        client2Messages=[];

        await new Promise(r=>{
            client1.onopen = r
        })
        await new Promise(r=>{
            client2.onopen = r;
        })
       

        client1.onmessage=(event)=>{
            const data=JSON.parse(event.data);
            if(data.status)
                client1Messages.push(data);
            
        }
        client2.onmessage=(event)=>{
            const data=JSON.parse(event.data);
            if(data.status)
                client2Messages.push(data);
        }
        
        client1.addEventListener("error", (event) => {
            error("client-1 error:", event);
        });

        client2.addEventListener("error", (event) => {
            error("client-2 error:", event);
        });
    });

    afterEach(() => {
        if (client1.readyState === WebSocket.OPEN) {
            client1.close();
        }
        if (client2.readyState === WebSocket.OPEN) {
            client2.close();
        }
    });

    it('Should Create a meeting', async () => { 
        const meetId = crypto.randomUUID();
        const joinData= JSON.stringify({
            type: Events.JOIN,
            roomId: meetId,
            clientName: "client-1"
        });
        client1.send(joinData);
        const message = await waitForAndPopLatestMessage(client1Messages);
        expect(message).toEqual({status:Events.MEETING_CREATED,output:null,message:"Waiting for other client to connect."});
    });
   
    it('Should Start Meeting', async() => {
        const meetId = crypto.randomUUID();
        const joinData1= JSON.stringify({
            type: Events.JOIN,
            roomId: meetId,
            clientName: "client-1"
        });
        const joinData2= JSON.stringify({
            type: Events.JOIN,
            roomId: meetId,
            clientName: "client-2"
        });
        client1.send(joinData1);
        await waitForAndPopLatestMessage(client1Messages); //remove meeting-created.
        client2.send(joinData2);

        const message1 = await waitForAndPopLatestMessage(client1Messages);
        expect(message1).toEqual({status: Events.MEETING_STARTED, output: null, message: "Meeting got started."});
        const message2 = await waitForAndPopLatestMessage(client2Messages)
        expect(message2).toEqual({status: Events.MEETING_STARTED, output: null, message: "Meeting got started."});
    });

    it('Should execute and return output', async() => {
        const meetId = crypto.randomUUID();
        const joinData1= JSON.stringify({
            type: Events.JOIN,
            roomId: meetId,
            clientName: "client-1"
        });
        const joinData2= JSON.stringify({
            type: Events.JOIN,
            roomId: meetId,
            clientName: "client-2"
        });
        client1.send(joinData1);
        await waitForAndPopLatestMessage(client1Messages); //remove meeting-created message
        client2.send(joinData2);
        
        await waitForAndPopLatestMessage(client1Messages); //remove meeting-started message
        await waitForAndPopLatestMessage(client2Messages); //remove meeting-started message

        client1.send(JSON.stringify({
            type: Events.EXECUTE,
            code: "print(\"hello-world\");",
            lang: "python",
            roomId: meetId
        }));

        let message1 = await waitForAndPopLatestMessage(client1Messages)
        expect(message1).toEqual({status: Events.EXECUTION_IN_PROGRESS, output: null, message: "Compiling the code."});
        let message2 = await waitForAndPopLatestMessage(client2Messages)
        expect(message2).toEqual({status: Events.EXECUTION_IN_PROGRESS, output: null, message: "Compiling the code."});


        message1 = await waitForAndPopLatestMessage(client1Messages)
        message2 = await waitForAndPopLatestMessage(client2Messages)
        expect(message1).toEqual(expect.objectContaining({
            status: Events.EXECUTION_COMPLETED,
            message: "Code executed successfully",
            output: "hello-world"
        }));
        expect(message2).toEqual(expect.objectContaining({
            status: Events.EXECUTION_COMPLETED,
            message: "Code executed successfully",
            output: "hello-world"
        }));
        expect(message1).toEqual(message2);
        log(message1);
    });
});
// TODO: Write tests for
    // Should execute all different languages
    // Should execute the code provided by both the clients connected in a meeting.
    // Should not allow to execute code if only meeting is not started yet.
    // Should close the meeting after 10 seconds when one of the clients get disconnected.
    // Should not allow to join in an invalid room.
    // Should not be able to get or execute code in other rooms. --> Yet to implement
    // Should not be able to execute malicious code (IMPORTANT)