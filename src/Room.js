import SocketResponse from "./utils/SocketResponse.js";

export class Room{
    id;
    client1;
    client2;
    code;
    output;
    lang;
    constructor(id){
        this.id=id;
        this.client1=null;
        this.client2=null;
        this.code="";
        this.output="";
        this.lang="";
    }
    sendOutput(){
        this.client1?.socket.send(new SocketResponse("success",this.output,"Compilation successfull."));
        this.client2?.socket.send(new SocketResponse("success",this.output,"Compilation successfull."));
    }
}