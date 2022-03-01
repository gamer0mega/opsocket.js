export class CloseFrame {
    constructor(frame) {
        this.code = frame.data.readUInt16BE(0) || 1005;
        this.reason = frame.data.slice(2);
    };
};