# Welcome to OPSocket.js!
## What is OPSocket?
OPSocket is a Fast WebSocket Client for NodeJS, Designed for Heavy Usage and Abusage.
## Moving to OPSocket.js v2.0.0 from v1.1.5
#### v2.0.0 is a breaking update.
### What to Change?
#### External
`WebSocket.state` => `WebSocket.status`

`WebSocket.url` => `WebSocket.options.url`
#### Options - Accessing from outside
`WebSocket.asyncIterator` => `WebSocket.options.asyncIterator`

`WebSocket.requestTimeout` => `WebSocket.options.requestTimeout`

`WebSocket.events` => `WebSocket.options.events`
#### Timers
`WebSocket.timeout` => `WebSocket.timers.open`

`WebSocket.closeTimeout` => `WebSocket.timers.close`
#### Sockets
`WebSocket.socket` => `WebSocket.sockets.tls`

`WebSocket.requestSocket` => `WebSocket.sockets.request`
#### Frames
`WebSocket.frameHeader` => `WebSocket.frames.header`

`WebSocket.bufferList` => `WebSocket.frames.bufferList`

`WebSocket.currentFrame` => `WebSocket.frames.current`
#### Nonce Data
`WebSocket.nonce` => `WebSocket.nonceData.initial`

`WebSocket.expectedNonce` => `WebSocket.nonceData.responseExpected`

`WebSocket.actualNonce` => `WebSocket.nonceData.responseActual`
## How to Use it?
You Can take a look at the WebSocket Class in [Our Docs](https://opsocket.bruhbot.rocks) to see usage examples.
## Support
Feel free to join our [Discord Community and Support Server](https://discord.gg/jnzkPmukuv).

Please Note That The Client is Currently in Beta and May Have Bugs.