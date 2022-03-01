// This file was copied from https://github.com/substack/node-bufferlist and modified to work better with newer Node versions.

// bufferlist.js
// Treat a linked list of buffers as a single letiable-size buffer.
let head = { next : null, buffer : null };
let last = { next : null, buffer : null };
let length = 0;
let offset = 0;

export class BufferList {
    get length() {
        return length;
    };

    write(buf) {
        if (!head.buffer) {
            head.buffer = buf;
            last = head;
        }
        else {
            last.next = { next : null, buffer : buf };
            last = last.next;
        }
        length += buf.length;
        return true;
    };

    forEach(fn) {
        if (!head.buffer) return Buffer.allocUnsafe(0);
        
        if (head.buffer.length - offset <= 0) return this;
        let firstBuf = head.buffer.slice(offset);
        
        let b = { buffer : firstBuf, next : head.next };
        
        while (b && b.buffer) {
            let r = fn(b.buffer);
            if (r) break;
            b = b.next;
        }
        
        return this;
    };
    
    join(start, end) {
        if (!head.buffer) return Buffer.allocUnsafe(0);
        if (start == undefined) start = 0;
        if (end == undefined) end = this.length;
        
        let big = Buffer.allocUnsafe(end - start);
        let ix = 0;
        this.forEach(function (buffer) {
            if (start < (ix + buffer.length) && ix < end) {
                // at least partially contained in the range
                buffer.copy(
                    big,
                    Math.max(0, ix - start),
                    Math.max(0, start - ix),
                    Math.min(buffer.length, end - ix)
                );
            }
            ix += buffer.length;
            if (ix > end) return true; // stop processing past end
        });
        
        return big;
    };
    
    joinInto(targetBuffer, targetStart, sourceStart, sourceEnd) {
        if (!head.buffer) return new Buffer.allocUnsafe(0);
        if (sourceStart == undefined) sourceStart = 0;
        if (sourceEnd == undefined) sourceEnd = this.length;
        
        let big = targetBuffer;
        if (big.length - targetStart < sourceEnd - sourceStart) {
            throw new Error("Insufficient space available in target Buffer.");
        }
        let ix = 0;
        this.forEach(function (buffer) {
            if (sourceStart < (ix + buffer.length) && ix < sourceEnd) {
                // at least partially contained in the range
                buffer.copy(
                    big,
                    Math.max(targetStart, targetStart + ix - sourceStart),
                    Math.max(0, sourceStart - ix),
                    Math.min(buffer.length, sourceEnd - ix)
                );
            }
            ix += buffer.length;
            if (ix > sourceEnd) return true; // stop processing past end
        });
        
        return big;
    };
    
    advance(n) {
        offset += n;
        length -= n;
        while (head.buffer && offset >= head.buffer.length) {
            offset -= head.buffer.length;
            head = head.next
                ? head.next
                : { buffer : null, next : null }
            ;
        }
        if (head.buffer === null) last = { next : null, buffer : null };
        return this;
    };

    take(n) {
        if (n == undefined) n = this.length;
        return this.join(0, n);
    };
};