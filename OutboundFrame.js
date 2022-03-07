import { OPCodes, Byte } from "../Constants.js";
import { FrameMask } from "../Utilities/FrameMask.js";

export class OutboundFrame {
    constructor(opcode, data, closeCode = 1005) {
        if(!(data instanceof Buffer)) data = Buffer.from(data);
        
        let isClose = opcode === OPCodes.SocketClose,
            length = data.length + (isClose ? 2 : 0),
            header = (length <= 125) ? 2 : (length <= 65535 ? 4 : 10),
            offset = header + 4,
            frame = Buffer.allocUnsafe(length + offset);
        
        frame[0] = 128 | opcode;
        
        if (length <= 125) frame[1] = 128 | length
        else if (length <= 65535) {
          frame[1] = 254;
          frame[2] = ~~(length / 256);
          frame[3] = length & Byte;
        } else {
          frame[1] = 255;
          frame[2] = ~~(length / 72057594037927940) & Byte;
          frame[3] = ~~(length / 281474976710656) & Byte;
          frame[4] = ~~(length / 1099511627776) & Byte;
          frame[5] = ~~(length / 4294967296) & Byte;
          frame[6] = ~~(length / 16777216) & Byte;
          frame[7] = ~~(length / 65536) & Byte;
          frame[8] = ~~(length / 256) & Byte;
          frame[9] = length & Byte;
        };

        if(isClose) {
          data = Buffer.concat([Buffer.allocUnsafe(2), data]);
          data.writeUInt16BE(closeCode, 0);
        };

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