/**
 * Lightweight iconv-lite stub for Cloudflare Workers edge environment.
 * Replaces node-only iconv-lite streams extension which crashes with:
 * "Uncaught TypeError: require_streams(...) is not a function"
 */

const { StringDecoder } = require('string_decoder');

function normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  const clean = String(enc).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean === 'utf8') return 'utf8';
  if (clean === 'ascii') return 'ascii';
  if (clean === 'latin1' || clean === 'binary' || clean === 'iso88591') return 'latin1';
  if (clean === 'utf16le' || clean === 'ucs2') return 'utf16le';
  if (clean === 'base64') return 'base64';
  if (clean === 'hex') return 'hex';
  return clean;
}

function encodingExists(enc) {
  try {
    const norm = normalizeEncoding(enc);
    return Buffer.isEncoding(norm);
  } catch {
    return false;
  }
}

function decode(buf, encoding) {
  const enc = normalizeEncoding(encoding);
  const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || '');
  return buffer.toString(Buffer.isEncoding(enc) ? enc : 'utf8');
}

function encode(str, encoding) {
  const enc = normalizeEncoding(encoding);
  return Buffer.from(String(str ?? ''), Buffer.isEncoding(enc) ? enc : 'utf8');
}

function getDecoder(encoding) {
  const enc = normalizeEncoding(encoding);
  if (!Buffer.isEncoding(enc)) {
    throw new Error("Encoding not recognized: '" + encoding + "'");
  }
  const decoder = new StringDecoder(enc);
  return {
    write(buf) {
      return decoder.write(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
    },
    end() {
      return decoder.end();
    }
  };
}

function getEncoder(encoding) {
  const enc = normalizeEncoding(encoding);
  if (!Buffer.isEncoding(enc)) {
    throw new Error("Encoding not recognized: '" + encoding + "'");
  }
  return {
    write(str) {
      return Buffer.from(str, enc);
    },
    end() {
      return Buffer.alloc(0);
    }
  };
}

module.exports = {
  encodingExists,
  decode,
  encode,
  getDecoder,
  getEncoder
};
module.exports.default = module.exports;
