import { request } from 'https';
import { BufferList } from './Utilities/BufferList.js';
import { ConnectionStates, DataTypes, DefaultCloseDescriptions, FrameStates, OPCodes, SupportedProtocols } from './Constants.js';
import { BaseFrame } from './Frames/Frame.js';
import { DataFrame } from './Frames/DataFrame.js';
import { OutboundFrame } from './Frames/OutboundFrame.js';
import { GenerateNonce } from './Utilities/GenerateNonce.js';
import { CloseFrame } from './Frames/CloseFrame.js';
import { CloseError, SocketError } from './Errors.js';
let incomingLock;
let onMessage;
let onClose;
let messageQueue = [];

function resetLock() {
    incomingLock = new Promise((resolve, reject) => {
        onMessage = resolve;
        onClose = reject;
    });
};

export class WebSocket {
    /**
     * Represents a WebSocket
     * @name WebSocket
     * @class WebSocket
     * @param [options.url] - The WebSocket URL to Connect to. You can specify it in the open method, so it is optional.
     * @param [options.events] - An Object Containing all The Events. The addListener and on methods do use this object too. See The Events tab for all The Events.
     * @param [options.timeout] - The WebSocket Handshake Time until aborting.
     * @param [options.asyncIterator] - Whether to use Async Iterator over emit.
     * @property frameHeader { Buffer } - The Latest WebSocket Frame Header.
     * @property bufferList { BufferList } - A List of Frame Buffers to process.
     * @property currentFrame { BaseFrame } - The Current Frame Being Processed.
     * @property handleFramesBind { Function } - A Bind to the handleFrames Method.
     * @property url? { URL } - The WebSocket URL to Connect to.
     * @property events { Object } - An Object Containing all the events.
     * @property asyncIterator { Boolean } - Whether to use Async Iterator over emit.
     * @property state { Number } - The WebSocket Connection State. Refer to Constants for more information.
     * @property requestTimeout { Number } - The Time until The Connection will Get aborted if The Handshake was not completed.
     * @example
     * // Async Iterator.
     * import { WebSocket } from 'opsocket.js';
     * const WS = new WebSocket({
     *  url: 'wss://gateway.discord.gg?v=10',
     *  asyncIterator: true,
     *  timeout: 5000
     * })
     * .on('close', (code, reason) => console.log('WebSocket Closed | ' + code + ' | ' + reason.toString()))
     * .on('failure', (reason) => console.error('WebSocket Error | ', reason.toString()));
     * try {
     *      await WS.open();
     *      for await(const frame of WS.incoming()) {
     *          let data;
     *          try {
     *              data = JSON.parse(frame.data);
     *          } catch {
     *              continue;
     *          };
     *          console.log('Received |', data)
     *          switch(data.op) {
     *              case 10:
     *                  WS.send(JSON.stringify({
     *                      op: 2,
     *                      d: {
     *                          token: 'Discord Bot Token',
     *                          intents: 513,
     *                          properties: {
     *                              browser: 'OPSocket.js'
     *                          }
     *                      }
     *                  }));
     *                  break;
     *          };
     *      };
     *  } catch(error) {
     *      console.error('Failed to Open The WebSocket!', error);
     *  };
     * 
     * // Message Event Listener.
     * 
     * import { WebSocket } from 'opsocket.js';
     * const WS = new WebSocket({
     *  url: 'wss://gateway.discord.gg?v=10',
     *  asyncIterator: false,
     *  timeout: 5000
     * })
     * .on('close', (code, reason) => console.log('WebSocket Closed | ' + code + ' | ' + reason.toString()))
     * .on('failure', (reason) => console.error('WebSocket Error | ', reason.toString()))
     * .on('message', (frame) => {
     *      let data;
     *      try {
     *          data = JSON.parse(frame.data);
     *      } catch {
     *          return;
     *      };
     *      console.log('Received |', data)
     *      switch(data.op) {
     *          case 10:
     *              WS.send(JSON.stringify({
     *                  op: 2,
     *                  d: {
     *                      token: 'Discord Bot Token',
     *                      intents: 513,
     *                      properties: {
     *                          browser: 'OPSocket.js'
     *                      }
     *                  }
     *              }));
     *              break;
     *      };
     * });
     * try {
     *      await WS.open();
     *  } catch(error) {
     *      console.error('Failed to Open The WebSocket!', error);
     *  };
     */
    constructor(options = {}) {
        if(typeof(options) === 'string') options = {
            url: options
        };
        this.frameHeader = Buffer.allocUnsafe(10);
        this.asyncIterator = options.asyncIterator;
        if(this.asyncIterator) resetLock();
        this.bufferList = new BufferList();
        this.currentFrame = new BaseFrame(this.frameHeader);
        this.handleFramesBind = this.handleFrames.bind(this);
        this.events = options.events || {};
        this.state = ConnectionStates.Closed;
        this.requestTimeout = options.timeout || 15000;
        if(options.url) this.url = new URL(options.url);
    };

    /**
     * Opens a New WebSocket Connection
     * @method open
     * @instance
     * @memberof WebSocket
     * @param [url] - The WebSocket URL to open The Connection to.
     */

    open(url) {
        return new Promise((resolve, reject) => {
            if(this.state != ConnectionStates.Closed) return reject(new Error('Cannot open a WebSocket while it is not Closed.'));
            try {
                this.nonce = GenerateNonce();
                if(url) this.url = new URL(url);
                if(!this.url) return reject(new URIError('No WebSocket Server URL Was Passed.'));
                if(!SupportedProtocols.includes(this.url.protocol)) return reject(new URIError('Unknown Protocol - ' + this.url.protocol));
                if(this.socket) delete this.socket;
                this.state = ConnectionStates.Handshaking;
                this.requestSocket = request({
                    method: 'GET',
                    host: this.url.host,
                    url: this.url.href,
                    headers: {
                        host: this.url.host,
                        upgrade: 'WebSocket',
                        connection: 'upgrade',
                        'sec-websocket-key': this.nonce,
                        'sec-websocket-version': 13
                    }
                });
                this.requestSocket.end();
            } catch(error) {
                reject(error);
                this.abort(error);
            };
            this.startTimeout();
            this.requestSocket
                .on('response', response => {
                    let validation = this.validateHandshake(response);
                    if(validation != true) {
                        reject(validation);
                        this.abort(validation);
                    };
                })
                .on('error', error => {
                    this.abort('Failed to perform the initial WebSocket Request: ' + error);
                })
                .on('upgrade', async (response, socket) => {
                    let validation = this.validateHandshake(response);
                    if(validation != true) {
                        reject(validation);
                        this.abort(validation);
                    };
                    this.socket = socket;
                    this.state = ConnectionStates.Open;
                    resolve(this);
                    clearTimeout(this.timeout);
                    /**
                     * Gets Emitted when The WebSocket gets Open.
                     * @event open
                     * @property WebSocket - The WebSocket that got Open.
                     */
                    this.dispatchEvent('open', this);
                    try {
                        for await (const chunk of socket) {
                            this.handleSocketData(chunk);
                        };
                    } catch(error) {
                        return this.abort(error);
                    };
                    if(this.state != ConnectionStates.Closing && this.state != ConnectionStates.Closed) this.abort('Unexpected TLSSocket Readable Stream End.');
                });
        });
    };

    validateHandshake(response) {
        if(response.statusCode != 101) return 'Unexpected WebSocket Server Opening Handshake Status Code - ' + response.statusCode + ' (101 Switching Protocols Expected)';
        if(!response.headers) return 'Missing Headers in The Opening Handshake.';
        if(response.headers.connection?.toLowerCase() != 'upgrade') return 'Expected a "connection: upgrade" header in The Opening Handshake.';
        if(response.headers.upgrade?.toLowerCase() != 'websocket') return 'Expected a "upgrade: websocket" header in The Opening Handshake.';
        return true;
    };

    startTimeout() {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.abort('WebSocket Handshake Timed out.'), this.requestTimeout);
    };

    startCloseTimeout() {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = setTimeout(() => this.abort('WebSocket Close Timed Out.'), 5000);
    };

    /**
     * Sends a Data Frame.
     * @method send
     * @instance
     * @memberof WebSocket
     * @param data - The Data to Send.
     */

    send(data) {
        return this.write((typeof(data) === 'string' ? OPCodes.TextMessage : OPCodes.BinaryMessage), data);
    };

    /**
     * Sends a ping Frame.
     * @method ping
     * @instance
     * @memberof WebSocket
     * @param [data] - The Data to Send with The Ping Frame.
     */

    ping(data = '') {
        return this.write(OPCodes.Ping, data);
    };

    /**
     * Sends a pong Frame.
     * @method pong
     * @instance
     * @memberof WebSocket
     * @param [data] - The Data to Send with The Pong Frame.
     */

    pong(data = '') {
        return this.write(OPCodes.Pong, data);
    };

    /**
     * Closes The WebSocket Connection.
     * @method close
     * @instance
     * @memberof WebSocket
     * @param [closeCode] - The Close Code to Send.
     * @param [reason] - A String Explaining why is The WebSocket Connection Closing.
     */

    close(closeCode = 1000, reason = '') {
        return new Promise((resolve, reject) => {
            switch(this.state) {
                case ConnectionStates.Handshaking:
                case ConnectionStates.Closing:
                    this.abort(reason, closeCode);
                case ConnectionStates.Closed:
                    return resolve();
            };
            this.closeResolve = resolve;
            this.closeReject = reject;
            this.startCloseTimeout();
            return this.write(OPCodes.SocketClose, reason, closeCode);
        });
    };

    /**
     * Aborts The WebSocket Connection, emits The Close and Failure events.
     * @method abort
     * @instance
     * @memberof WebSocket
     * @param [reason] - The Abort Reason.
     * @param [code] - The Abort Close Code.
     */

    abort(reason = 'Unknown Abnormal Connection Abort', code = 1006) {
        if(this.socket?.ended) return false;
        if(!this.endSocket()) this.performCloseState();
        this.emitClose(code, reason);
        this.emitFailure(reason);
        if(this.closeReject) {
            this.closeReject(reason);
            delete this.closeReject;
            delete this.closeResolve;
        };
        return true;
    };

    performCloseState() {
        if(this.requestSocket) {
            this.requestSocket.destroy(false);
            delete this.requestSocket;
        };
        this.state = ConnectionStates.Closed;
    };

    endSocket() {
        if(!this.socket) return false;
        this.performCloseState();
        this.socket.ended = true;
        this.socket.end();
        return true;
    };

    /**
     * Builds and Writes The Raw Outbound Frame to The TLSSocket.
     * @method write
     * @instance
     * @memberof WebSocket
     * @param opcode { Number } - The OPCode to write.
     * @param data { Buffer } - The Data to write.
     * @param [closeCode] { Number } - The Close Code to write if it's a Close Frame. 
     */

    write(opcode, data, closeCode) {
        if(this.state != ConnectionStates.Open || !this.socket?.writable) return false;
        let frame = new OutboundFrame(opcode, data, closeCode);
        this.socket.write(frame.prepare());
        return true;
    };

    handleSocketData(data) {
        this.bufferList.write(data);
        this.handleFrames();
    };

    emitMessage(frame) {
        if(this.asyncIterator) {
            messageQueue.push(frame);
            onMessage?.();
        }
        else /**
        * Gets Emitted when The WebSocket Receives a Message.
        * @event message
        * @property frame { DataFrame } - The Data Frame, Containing the Data Type and the Payload.
        * @example WebSocket.on('message', frame => console.log('Received a Message | Type -', frame.type, '| Data -', frame.data.toString()));
        */ this.dispatchEvent('message', frame);
    };

    emitClose(code = 1005, reason) {
        clearTimeout(this.closeTimeout);
        clearTimeout(this.timeout);
        if(!reason?.length) reason = Buffer.from(DefaultCloseDescriptions[code] || '');
        if(this.asyncIterator) onClose?.(new CloseError(code, reason))
        else /**
        * Gets Emitted when The WebSocket gets Closed.
        * @event close
        * @property code { Number } - The Close Code.
        * @property reason { Buffer } - The Close Reason.
        * @example WebSocket.on('close', (code, reason) => console.log('WebSocket Closed |', code, '|', reason.toString()));
        */ this.dispatchEvent('close', code, reason);
    };

    emitFailure(reason) {
        if(this.asyncIterator) onClose?.(new SocketError(reason))
        else /**
        * Gets Emitted when The WebSocket has an issue with The Connection.
        * @event failure
        * @property reason { String } - The Error Reason.
        * @example WebSocket.on('failure', reason => console.log('WebSocket Error |', reason));
        */ this.dispatchEvent('failure', reason);
    };

    handleFrames() {
        if(this.currentFrame.state === FrameStates.Finalized) this.currentFrame = new BaseFrame(this.frameHeader);
        let frame = this.currentFrame;
        if (!frame.push(this.bufferList)) return;
        /**
         * Gets Emitted when The WebSocket receives a Frame.
         * @event frame
         * @property frame { BaseFrame } - The Received Frame.
         */
        this.dispatchEvent('frame', frame);
        switch(frame.opcode) {
            case OPCodes.TextMessage:
                frame = new DataFrame(frame, DataTypes.Text);
                this.emitMessage(frame);
                break;
            case OPCodes.BinaryMessage:
                frame = new DataFrame(frame, DataTypes.Binary);
                this.emitMessage(frame);
                break;
            case OPCodes.SocketClose:
                frame = new CloseFrame(frame);
                if(this.closeResolve) {
                    this.closeResolve();
                    delete this.closeReject;
                    delete this.closeResolve;
                };
                this.endSocket();
                this.emitClose(frame.code, frame.reason);
                break;
            case OPCodes.Ping:
                /**
                 * Gets Emitted when The WebSocket receives a Ping Payload.
                 * @event ping
                 * @property Data { Buffer } - The Data Sent with The Ping.
                 * @example WebSocket.on('ping', data => console.log('Received a Ping Payload |', data.toString()));
                 */
                this.dispatchEvent('ping', frame.data);
                break;
            case OPCodes.Pong:
                /**
                 * Gets Emitted when The WebSocket receives a Pong Payload.
                 * @event pong
                 * @property Data { Buffer } - The Data Sent with The Pong.
                 * @example WebSocket.on('pong', data => console.log('Received a Pong Payload |', data.toString()));
                 */
                this.dispatchEvent('pong', frame.data);
                break;
            default:
                return this.abort('Unknown OPCode', 1002);
        };
        if (this.bufferList.length > 0) setImmediate(this.handleFramesBind);
    };

    addListener(event, callback) {
        this.events[event] = callback;
        return this;
    };

    removeListener(event) {
        delete this.events[event];
        return this;
    };

    removeAllListeners() {
        this.events = {};
        return this;
    };

    on(event, callback) {
        return this.addListener(event, callback);
    };

    off(event) {
        return this.removeListener(event);
    };

    dispatchEvent(event, ...args) {
        this.events[event]?.(...args);
    };

    emit(event, ...args) {
        this.dispatchEvent(event, ...args);
    };

    /**
     * An Async Iterator which throws an error when The WebSocket closes or gets an error and returns the DataFrames inside the iterator. You Must enable asyncIterator in options or use CreateWebSocket to use this.
     * @method incoming
     * @instance
     * @memberof WebSocket
     */

    async *incoming() {
        if(!this.asyncIterator) throw new Error('Cannot Use WebSocket#incoming() without asyncIterator: true.');
        while(true) {
            await incomingLock;
            while(messageQueue.length) yield messageQueue.shift();
            resetLock();
        };
    };
};