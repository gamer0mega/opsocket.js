export function FrameMask(payload, mask, offset = 0) {
    for (let index = 0, maskUntil = payload.length - offset; index < maskUntil; index++)
        payload[offset + index] = payload[offset + index] ^ mask[index % 4];
    return payload;
};