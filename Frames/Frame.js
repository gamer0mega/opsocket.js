// Inspired by https://github.com/theturtle32/WebSocket-Node/blob/master/lib/WebSocketFrame.js

import { BinaryHelpers, FrameStates } from '../Constants.js';

export class BaseFrame {
    constructor(frameHeader) {
        this.frameHeader = frameHeader;
        this.state = FrameStates.ParsingHeader;
        this.firstByte = null;
        this.secondByte = null;
    };

    push(bufferList) {
        if(this.state === FrameStates.ParsingHeader) {
           if(bufferList.length <= 1) return false;
           bufferList.joinInto(this.frameHeader, 0, 0, 2);
           bufferList.advance(2);
           this.firstByte = this.frameHeader[0];
           this.secondByte = this.frameHeader[1];
           this.fin = !!(this.firstByte & BinaryHelpers.Fin);
           this.opcode = this.firstByte & BinaryHelpers.OPCode;
           this.length = this.secondByte & BinaryHelpers.Length;
           switch(this.length) {
           case 126:
               this.state = FrameStates.Awaiting16Bit;
               break;
           case 127:
               this.state = FrameStates.Awaiting64Bit;
               break;
           default:
               this.state = FrameStates.AwaitingPayload;
           };
        };

        if(this.state === FrameStates.Awaiting16Bit) {
            if(bufferList.length <= 1) return false;
            bufferList.joinInto(this.frameHeader, 2, 0, 2);
            bufferList.advance(2);
            this.length = this.frameHeader.readUInt16BE(2);
            this.state = FrameStates.AwaitingPayload;
        }
        else if(this.state === FrameStates.Awaiting64Bit) {
            if(bufferList.length <= 7) return false;
            bufferList.joinInto(this.frameHeader, 2, 0, 8);
            bufferList.advance(8);
            this.length = this.frameHeader.readUInt32BE(6);
            this.state = FrameStates.AwaitingPayload;
        };
 
        if(this.state === FrameStates.AwaitingPayload) {
            if(!this.length) {
                this.data = Buffer.allocUnsafe(0);
                this.success();
            };
            if(bufferList.length < this.length) return false;
            this.data = bufferList.take(this.length);
            bufferList.advance(this.length);
            return this.success();
        };
        return false;
    };

    success() {
        this.state = FrameStates.Finalized;
        return true;
    };
 
    abort(bufferList) {
        if (bufferList.length >= this.length) {
            bufferList.advance(this.length);
            this.state = FrameStates.Finalized;
            return true;
        };
        return false;
    };
};