export class Client{
    name;
    socket;
    constructor(name,ws){
        this.name=name;
        this.socket=ws;
    }
}