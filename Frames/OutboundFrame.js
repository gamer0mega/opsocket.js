import { OPCodes } from "../Constants.js";
import { FrameMask } from "../Utilities/FrameMask.js";

export class OutboundFrame {
    constructor(opcode, data, closeCode = 1005) {
        this.opcode = opcode;
        if(!(data instanceof Buffer)) data = Buffer.from(data);
        let isClose = this.opcode === OPCodes.SocketClose,
            length = data.length + (isClose ? 2 : 0),
            header = (length <= 125) ? 2 : (length <= 65535 ? 4 : 10),
            offset = header + 4,
            frame = Buffer.allocUnsafe(length + offset),
            byte = 255;
        frame[0] = 128 | opcode;
        
        if (length <= 125) frame[1] = 128 | length
        else if (length <= 65535) {
          frame[1] = 254;
          frame[2] = ~~(length / 256);
          frame[3] = length & byte;
        } else {
          frame[1] = 255;
          frame[2] = ~~(length / 72057594037927940) & byte;
          frame[3] = ~~(length / 281474976710656) & byte;
          frame[4] = ~~(length / 1099511627776) & byte;
          frame[5] = ~~(length / 4294967296) & byte;
          frame[6] = ~~(length / 16777216) & byte;
          frame[7] = ~~(length / 65536) & byte;
          frame[8] = ~~(length / 256) & byte;
          frame[9] = length & byte;
        };
        if(isClose) {
          data = Buffer.concat([Buffer.allocUnsafe(2), data]);
          data.writeUInt16BE(closeCode, 0);
        };
        console.log(data)
        data.copy(frame, offset);

        this.frame = frame;
        this.header = header;
        this.offset = offset;
    };

    prepare() {
        this.mask = [~~(Math.random() * 256), ~~(Math.random() * 256), ~~(Math.random() * 256), ~~(Math.random() * 256)];
        Buffer.from(this.mask).copy(this.frame, this.header);
        return FrameMask(this.frame, this.mask, this.offset);
    };
};