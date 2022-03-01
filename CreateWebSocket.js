import { WebSocket } from "./WebSocket.js";

/**
 * Creates a New WebSocket.
 * @param options|url - The Options to pass to The WebSocket Constructor.
 * @returns Promise[WebSocket, Error]
 * @example
 * import { CreateWebSocket } from 'opsocket.js';
 * const [ WebSocket, Failure ] = await CreateWebSocket('wss://gateway.discord.gg?v=10');
 * if(Failure) console.error('Failed to Open The WebSocket!', Failure);
 *  else try {
 *      for await(const frame of WebSocket.incoming()) {
 *          let data;
 *          try {
 *              data = JSON.parse(frame.data);
 *          } catch {
 *              continue;
 *          };
 *          console.log('Received |', data)
 *          switch(data.op) {
 *              case 10:
 *                  WebSocket.send(JSON.stringify({
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
 *      if(error.isClose) console.log('WebSocket Closed | ' + error.code + ' | ' + error.reason.toString())
 *      else if(error.isError) console.error('WebSocket Error | ', error.toString());
 *      else console.error('Error', error);
 *  };
 */

export async function CreateWebSocket(options = {}) {
    let websocket = null;
    let error = null;
    if(typeof(options) === 'string') options = {
        url: options
    };
    if(options.asyncIterator === undefined) options.asyncIterator = true;
    try {
        websocket = await new WebSocket(options).open();
    } catch(err) {
        error = err;
    };
    return [ websocket, error ];
};