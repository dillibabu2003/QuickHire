import WebSocket from "ws";
import {log,error} from "console";
import Events from "../src/utils/SocketEvents";

describe("Join and Start Meeting and Execution of Code", () => {
    let meetId = crypto.randomUUID();
    let client1;
    let client2;
    let client1Messages=[];
    let client2Messages=[];
    const joinData1 = JSON.stringify({
        type: "join",
        roomId: meetId,
        clientName: "client-1"
    });
    const joinData2 = JSON.stringify({
        type: "join",
        roomId: meetId,
        clientName: "client-2"
    });

    async function waitForAndPopLatestMessage(clientMessages){
        return new Promise(function (resolve){
            log(clientMessages)
            if(clientMessages.length>0){
                log("if");
                setTimeout(()=>{
                    log(clientMessages)
                    if(clientMessages.length ===2){
                        clientMessages.shift()
                    }
                    resolve(clientMessages.shift()); //waits if there are no new msgs.
                },2000);
                // resolve(client1Messages.shift()) 
            }
            else{
                log("else");
                setTimeout(()=>{
                    if(clientMessages.length ===2){
                        clientMessages.shift()
                    }
                    resolve(clientMessages.shift()); //waits if there are no new msgs.
                },2000);
            }
        })
    }
    beforeEach(async () => {
        client1 = new WebSocket("ws://localhost:8888");
        client2 = new WebSocket("ws://localhost:8888");

        await new Promise(r=>{
            client1.onopen = r
        })
        await new Promise(r=>{
            client2.onopen = r;
        })
       

        client1.onmessage=(event)=>{
            client1Messages.push(JSON.parse(event.data));
        }
        client2.onmessage=(event)=>{
            client2Messages.push(JSON.parse(event.data));
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
        client1.send(joinData1);
        const message = await waitForAndPopLatestMessage(client1Messages);
        expect(message).toEqual({status:Events.MEETING_CREATED,output:null,message:"Waiting for other client to connect."});
    });

    it('Should Start Meeting', async() => {

        log("Before")
        log("-----------")
        log("client-1 messages")
        log(client1Messages);
        log("----------")
        log("client-2 messages")
        log(client2Messages);
        log("----------")
        client1.send(joinData1);
        client2.send(joinData2);
        log("After")
        log("-----------")
        log("client-1 messages")
        log(client1Messages);
        log("----------")
        log("client-2 messages")
        // log(client2Messages);
        log("----------")

        const message1 = await waitForAndPopLatestMessage(client1Messages)
        expect(message1).toEqual({status: Events.MEETING_STARTED, output: null, message: "Meeting got started."});
        const message2 = await waitForAndPopLatestMessage(client2Messages)
        expect(message2).toEqual({status: Events.MEETING_STARTED, output: null, message: "Meeting got started."});
    });

    test.skip('Should execute and return output', async() => {
        client1.send(JSON.stringify({
            type: Events.EXECUTE,
            code: "console.log(\"hello-world\")",
            lang: "js",
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
            message: expect.stringMatching(/(Compilation successful.|Execution completed successfully.)/)
        }));
        expect(message2).toEqual(expect.objectContaining({
            status: Events.EXECUTION_COMPLETED,
            message: expect.stringMatching(/(Compilation successful.|Execution completed successfully.)/)
        }));
        expect(message1).toBe(message2);
    });
});