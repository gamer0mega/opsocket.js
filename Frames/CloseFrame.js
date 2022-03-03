export class CloseFrame {
    constructor(frame) {
        this.code = frame.length < 2 ? 1005 : frame.data.readUInt16BE(0);
        this.reason = frame.data.slice(2);
    };
};