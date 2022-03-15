import { request } from 'https';
import { createHash } from 'crypto';
import { BufferList } from './Utilities/BufferList.js';
import { ConnectionStates, DataTypes, DefaultCloseDescriptions, FrameStates, HeaderConcatNonce, OPCodes, SupportedProtocols } from './Constants.js';
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
     * @property status { Number } - The Current WebSocket Connection Status.
     * @property sockets.request? { ClientRequest } - The Initial WebSocket Request.
     * @property sockets.tls? { TLSSocket } - The Underlying TLS Socket Which Handles The WebSocket.
     * @property frames.bufferList { BufferList } - The BufferList which Handles all The Socket Data.
     * @property frames.header { Buffer } - The Current Frame Header.
     * @property frames.current { BaseFrame } - The Current Frame Being Processed.
     * @property remote.ip? { String } - The Remote WebSocket Server IP.
     * @property remote.port? { Number } - The Remote WebSocket Server Port.
     * @property nonceData.initial? { String } - The Initial WebSocket Nonce sent.
     * @property nonceData.responseExpected? { String } - The Expected Nonce to be Received From The Server.
     * @property nonceData.responseActual? { String } - The Actual Nonce Received From The Server.
     * @property options.requestTimeout { Number } - The Initial Request Timeout in Milliseconds.
     * @property options.events { Object } - An Object Containing All The Event Functions.
     * @property options.asyncIterator { Boolean } - Whether to use Async Iterator For The Message Event over emit.
     * @property options.url? { URL } - The Parsed WebSocket Server URL.
     * @property timers.open? { Timeout } - The Open Handshake Timeout.
     * @property timers.close? { Timeout } - The Close Handshake Timeout.
     * @property handleFramesBind { Function } - A Bind to the handleFrames function.
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
        this.status = ConnectionStates.Closed;
        Object.defineProperties(this, {
            sockets: {
                value: {},
                enumerable: false
            },
            frames: {
                value: {
                    bufferList: new BufferList(),
                    header: Buffer.allocUnsafe(10),
                    current: null
                },
                enumerable: false
            },
            remote: {
                value: {},
                enumerable: false,
                writable: true
            },
            nonceData: {
                value: {
                    initial: '',
                    responseExpected: '',
                    responseActual: ''
                },
                enumerable: false
            },
            options: {
                value: {
                    requestTimeout: options.timeout || 15000,
                    events: options.events || {},
                    asyncIterator: !!options.asyncIterator,
                    url: {}
                },
                enumerable: false
            },
            timers: {
                value: {},
                enumerable: false
            },
            handleFramesBind: {
                value: this.handleFrames.bind(this),
                enumerable: false
            }
        });
        this.frames.current = new BaseFrame(this.frames.header);
        if(this.options.asyncIterator) resetLock();
        if(options.url) this.options.url = new URL(options.url);
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
            if(this.status != ConnectionStates.Closed) return reject(new Error('Cannot open a WebSocket while it is not Closed.'));
            try {
                this.nonceData.initial = GenerateNonce();
                if(url) this.options.url = new URL(url);
                if(!this.options.url) return reject(new URIError('No WebSocket Server URL Was Passed.'));
                if(!SupportedProtocols.includes(this.options.url.protocol)) return reject(new URIError('Unknown Protocol - ' + this.options.url.protocol));
                if(this.sockets.tls) delete this.sockets.tls;
                this.status = ConnectionStates.Handshaking;
                this.sockets.request = request({
                    method: 'GET',
                    host: this.options.url.host,
                    url: this.options.url.href,
                    headers: {
                        host: this.options.url.host,
                        upgrade: 'WebSocket',
                        connection: 'upgrade',
                        'sec-websocket-key': this.nonceData.initial,
                        'sec-websocket-version': 13
                    }
                });
                this.sockets.request.end();
            } catch(error) {
                reject(error);
                this.abort(error);
            };
            this.startTimeout();
            this.sockets.request
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
                        return;
                    };
                    this.sockets.tls = socket;
                    this.remote = {
                        ip: socket.remoteAddress,
                        port: socket.remotePort
                    };
                    this.status = ConnectionStates.Open;
                    resolve(this);
                    clearTimeout(this.timers.open);
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
                        if(error.stack.includes('handleSocketData')) throw error;
                        return this.abort(error);
                    };
                    if(this.status != ConnectionStates.Closing && this.status != ConnectionStates.Closed) this.abort('Unexpected TLSSocket Readable Stream End.');
                });
        });
    };

    validateHandshake(response) {
        if(response.statusCode != 101) return 'Unexpected WebSocket Server Opening Handshake Status Code - ' + response.statusCode + ' (101 Switching Protocols Expected)';
        let { headers } = response;
        if(!headers) return 'Missing Headers in The Opening Handshake.';
        if(headers.connection?.toLowerCase() != 'upgrade') return 'Expected a "connection: upgrade" header in The Opening Handshake.';
        if(headers.upgrade?.toLowerCase() != 'websocket') return 'Expected a "upgrade: websocket" header in The Opening Handshake.';
        let sha1 = createHash('sha1');
        sha1.update(this.nonceData.initial + HeaderConcatNonce);
        this.nonceData.responseExpected = sha1.digest('base64');
        this.nonceData.responseActual = headers['sec-websocket-accept'];
        if(this.nonceData.responseActual != this.nonceData.responseExpected) return 'Expected "' + this.nonceData.responseExpected + '" as The Response Nonce, But Received "' + this.nonceData.responseActual + '" in The Opening Handshake.'
        return true;
    };

    startTimeout() {
        clearTimeout(this.timers.open);
        this.timers.open = setTimeout(() => this.abort('WebSocket Handshake Timed out.'), this.options.requestTimeout);
    };

    startCloseTimeout() {
        clearTimeout(this.timers.close);
        this.timers.close = setTimeout(() => this.abort('WebSocket Close Timed Out.'), 5000);
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
            let validation = this.validateCloseCode(closeCode);
            if(validation != true) return reject(new RangeError('Invalid Close Code - ' + closeCode + ' - ' + validation));
            switch(this.status) {
                case ConnectionStates.Handshaking:
                case ConnectionStates.Closing:
                    this.abort(reason, closeCode);
                case ConnectionStates.Closed:
                    return resolve();
            };
            this.closeResolve = resolve;
            this.closeReject = reject;
            this.startCloseTimeout();
            return this.write(OPCodes.SocketClose, reason, +closeCode);
        });
    };

    validateCloseCode(code) {
        if(isNaN(code)) return 'The Close Code Must be a Number.';
        if(code < 1000 || code >= 5000) return 'Out of The Allowed Range - Cannot be below 1000 or above 5000.'
        else if(code >= 1000 && code < 2000) {
            if(code >= 1016) return '1xxx Close Codes are Only Allowed in The Range from 1000 to 1015.';
            switch(code) {
                case 1004:
                case 1005:
                case 1006:
                    return 'These Close Codes can only be Generated Locally and not Sent to The Remote Peer.';
                default:
                    return true;
            };
        } else if(code >= 2000 && code < 3000) return 'The Close Codes between 2000 and 3000 are reserved by The WebSocket Protocol.'
        else if(code >= 3000 && code < 5000) return true;
        return 'Unknown Close Code.';
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
        if(this.sockets.tls?.ended) return false;
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
        if(this.sockets.request) {
            this.sockets.request.destroy(false);
            delete this.sockets.request;
        };
        this.status = ConnectionStates.Closed;
    };

    endSocket() {
        if(!this.sockets.tls) return false;
        this.performCloseState();
        this.sockets.tls.ended = true;
        this.sockets.tls.end();
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
        if(this.status != ConnectionStates.Open || !this.sockets.tls?.writable) return false;
        let frame = new OutboundFrame(opcode, data, closeCode);
        this.sockets.tls.write(frame.prepare());
        return true;
    };

    handleSocketData(data) {
        if(this.status === ConnectionStates.Closed) return;
        this.frames.bufferList.write(data);
        this.handleFrames();
    };

    emitMessage(frame) {
        if(this.options.asyncIterator) {
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
        clearTimeout(this.timers.close);
        clearTimeout(this.timers.open);
        if(!reason?.length) reason = Buffer.from(DefaultCloseDescriptions[code] || '');
        if(this.options.asyncIterator) onClose?.(new CloseError(code, reason))
        else /**
        * Gets Emitted when The WebSocket gets Closed.
        * @event close
        * @property code { Number } - The Close Code.
        * @property reason { Buffer } - The Close Reason.
        * @example WebSocket.on('close', (code, reason) => console.log('WebSocket Closed |', code, '|', reason.toString()));
        */ this.dispatchEvent('close', code, reason);
    };

    emitFailure(reason) {
        if(this.options.asyncIterator) onClose?.(new SocketError(reason))
        else /**
        * Gets Emitted when The WebSocket has an issue with The Connection.
        * @event failure
        * @property reason { String } - The Error Reason.
        * @example WebSocket.on('failure', reason => console.log('WebSocket Error |', reason));
        */ this.dispatchEvent('failure', reason);
    };

    handleFrames() {
        let frame = this.frames.current;
        if (!frame.push(this.frames.bufferList)) return;
        this.frames.current = new BaseFrame(this.frames.header);
        /**
         * Gets Emitted when The WebSocket receives a Frame.
         * @event frame
         * @property frame { BaseFrame } - The Received Frame.
         */
        this.dispatchEvent('frame', frame);
        switch(frame.opcode) {
            case OPCodes.Continuation:
                // Temporarily Ignore
                break;
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
                let validation = this.validateCloseCode(frame.code);
                if(validation != true) {
                    frame.code = 1002;
                    frame.reason = validation;
                };
                this.write(OPCodes.SocketClose, frame.reason, frame.code);
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
                break;
        };
        if (this.frames.bufferList.length > 0) setImmediate(this.handleFramesBind);
    };

    addListener(event, callback) {
        this.options.events[event] = callback;
        return this;
    };

    removeListener(event) {
        delete this.options.events[event];
        return this;
    };

    removeAllListeners() {
        this.options.events = {};
        return this;
    };

    on(event, callback) {
        return this.addListener(event, callback);
    };

    off(event) {
        return this.removeListener(event);
    };

    dispatchEvent(event, ...args) {
        this.options.events[event]?.(...args);
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
        if(!this.options.asyncIterator) throw new Error('Cannot Use WebSocket#incoming() without asyncIterator: true.');
        while(true) {
            await incomingLock;
            while(messageQueue.length) yield messageQueue.shift();
            resetLock();
        };
    };
};