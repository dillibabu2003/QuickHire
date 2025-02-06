export default class SocketResponse{
    status;
    output;
    message;
    constructor(status,output,message){
        this.status=status;
        this.output=output;
        this.message=message
    }
}