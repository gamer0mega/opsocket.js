/**
 * Contains all The Errors.
 * @name Errors
 * @property BaseError { Error } - The Base Error Object other Errors will be constructed from.
 * @property CloseError { Error } - An Error which will be thrown if Async Iterator is used and The WebSocket gets Closed.
 * @property SocketError { Error } - An Error which will be thrown if Async Iterator is used and The WebSocket has an issue with The Connection.
 */

class BaseError extends Error {
    constructor(...data) {
        super(...data);
        this.name = this.constructor.name;
        this.isClose = false;
        this.isError = false;
    };
};

class CloseError extends BaseError {
    constructor(code, reason) {
        super(reason || code);
        this.reason = reason;
        this.code = code;
        this.isClose = true;
    };
};

class SocketError extends Error {
    constructor(code, reason) {
        super();
        this.reason = reason;
        this.code = code;
        this.isError = true;
    };
};

export {
    BaseError,
    CloseError,
    SocketError
};