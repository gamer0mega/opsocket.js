import { DataTypes } from "../Constants.js";

export class DataFrame {
    constructor(frame, type) {
        this.type = type;
        switch(this.type) {
            case DataTypes.Text:
                this.data = frame.data.toString();
                break;
            case DataTypes.Binary:
                this.data = frame.data;
                break;
        };
    };
};