/**
 * Contains all The Predefined Values.
 * @name Constants
 * @property BinaryHelpers { Object } - The HEX Values That will be ANDed on each Frame.
 * @property OPCodes { Object } - Contains all The WebSocket Frame OPCodes.
 * @property ConnectionStates { Object } - Contains All The Possible WebSocket Connection States.
 * @property FrameStates { Object } - Contains All The Possible BaseFrame States.
 * @property DefaultCloseDescriptions { Object } - The Close Descriptions to Be Used if One Was Not Passed.
 * @property SupportedProtocols { Object } - Contains All The Supported Protocols By The Client.
 * @property DataTypes { Object } - Contains All The Possible Types for DataFrames.
 */

const BinaryHelpers = {
    OPCode: 0x0F,
    Length: 0x7F,
    Fin: 0x80
};

const OPCodes = {
    Continuation: 0x0,
    TextMessage: 0x1,
    BinaryMessage: 0x2,
    SocketClose: 0x8,
    Ping: 0x9,
    Pong: 0xA
};

const ConnectionStates = {
    Open: 0,
    Handshaking: 1,
    Closing: 2,
    Closed: 3
};

const FrameStates = {
    ParsingHeader: 1,
    Awaiting16Bit: 2,
    Awaiting64Bit: 3,
    AwaitingPayload: 4,
    Finalized: 5
};

const DefaultCloseDescriptions = {
    1000: 'The WebSocket Connection was Marked as Idle or The Reason was Fulfilled.',
    1001: 'The WebSocket Server is Restarting or Offline.',
    1002: 'WebSocket Protocol Violation.',
    1003: 'The WebSocket Server has Encountered an Unsupported Data Type.',
    1004: 'Reserved Status Code.',
    1005: 'The WebSocket Connection was Closed without a Status Code.',
    1006: 'Cannot Reach The WebSocket Server or The Connection was Reset.',
    1007: 'The Data Type Header Does not Match The Actual Data Type.',
    1008: 'WebSocket Server Policy Violation.',
    1009: 'The Message was Too Long to Process.',
    1010: 'Invalid Extensions.',
    1011: 'Unknown Hard Internal WebSocket Server Error.',
    1012: 'The WebSocket Server is Restarting.',
    1013: 'The WebSocket Server is Overloaded. Retry to Connect Later.',
    1014: 'The WebSocket Server is Unable to Estabilish a Connection due to its Upstream Server Returning Invalid Response.',
    1015: 'Failed to Perform The TLS Handshake.'
};

const SupportedProtocols = [
    'ws:',
    'wss:'
];

const DataTypes = {
    Text: 0,
    Binary: 1
};

const Byte = 255;

const HeaderConcatNonce = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export {
    BinaryHelpers,
    OPCodes,
    ConnectionStates,
    FrameStates,
    DefaultCloseDescriptions,
    SupportedProtocols,
    DataTypes,
    Byte,
    HeaderConcatNonce
};