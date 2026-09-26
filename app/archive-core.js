(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PhonoLayerArchive = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const enc = new TextEncoder();
  const dec = new TextDecoder('utf-8', { fatal: true });
  const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
  const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
  const MAX_ENTRIES = 4096;

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function u16(view, offset, value) { view.setUint16(offset, value, true); }
  function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
  function need(cond, msg) { if (!cond) throw new Error(msg); }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31),
      date: (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31)
    };
  }

  function concat(parts) {
    const total = parts.reduce((n, p) => n + p.length, 0);
    need(total <= MAX_ARCHIVE_BYTES, '存档过大');
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
  }

  function toBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return enc.encode(String(value));
  }

  function packStoreZip(files) {
    const entries = Object.entries(files || {});
    need(entries.length > 0, '存档不能为空');
    need(entries.length <= MAX_ENTRIES, '存档文件条目过多');
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const stamp = dosDateTime(new Date());
    const seen = new Set();

    for (const [name, value] of entries) {
      need(typeof name === 'string' && name.length > 0, '存档文件名无效');
      need(!seen.has(name), `存档存在重复文件名：${name}`); seen.add(name);
      const nameBytes = enc.encode(name);
      const data = toBytes(value);
      need(data.length <= MAX_ENTRY_BYTES, `存档条目过大：${name}`);
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0x0800); u16(lv, 8, 0);
      u16(lv, 10, stamp.time); u16(lv, 12, stamp.date); u32(lv, 14, crc); u32(lv, 18, data.length); u32(lv, 22, data.length);
      u16(lv, 26, nameBytes.length); u16(lv, 28, 0); local.set(nameBytes, 30);
      localParts.push(local, data);

      const central = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(central.buffer);
      u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0x0800); u16(cv, 10, 0);
      u16(cv, 12, stamp.time); u16(cv, 14, stamp.date); u32(cv, 16, crc); u32(cv, 20, data.length); u32(cv, 24, data.length);
      u16(cv, 28, nameBytes.length); u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0); u32(cv, 38, 0); u32(cv, 42, offset);
      central.set(nameBytes, 46); centralParts.push(central);
      offset += local.length + data.length;
      need(offset <= MAX_ARCHIVE_BYTES, '存档过大');
    }

    const central = concat(centralParts);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0); u16(ev, 8, entries.length); u16(ev, 10, entries.length);
    u32(ev, 12, central.length); u32(ev, 16, offset); u16(ev, 20, 0);
    return concat([...localParts, central, end]);
  }

  function findEocd(bytes) {
    const min = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= min; i--) {
      if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) return i;
    }
    return -1;
  }

  function unpackStoreZip(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    need(bytes.length <= MAX_ARCHIVE_BYTES, '存档过大');
    need(bytes.length >= 22, '不是有效的 PhonoLayer ZIP 容器');
    const eocd = findEocd(bytes);
    need(eocd >= 0 && eocd + 22 <= bytes.length, '不是有效的 PhonoLayer ZIP 容器');
    const ev = new DataView(bytes.buffer, bytes.byteOffset + eocd, 22);
    const diskNo = ev.getUint16(4, true), centralDisk = ev.getUint16(6, true);
    need(diskNo === 0 && centralDisk === 0, '不支持多卷 ZIP');
    const countDisk = ev.getUint16(8, true), count = ev.getUint16(10, true);
    need(count === countDisk && count <= MAX_ENTRIES, 'ZIP 条目数量异常');
    const centralSize = ev.getUint32(12, true), centralOffset = ev.getUint32(16, true);
    need(centralOffset + centralSize <= eocd && centralOffset <= bytes.length, 'ZIP 中央目录边界损坏');
    let pos = centralOffset;
    const centralEnd = centralOffset + centralSize;
    const files = {};
    const seen = new Set();

    for (let i = 0; i < count; i++) {
      need(pos + 46 <= centralEnd, 'ZIP 中央目录损坏');
      const cv = new DataView(bytes.buffer, bytes.byteOffset + pos, 46);
      need(cv.getUint32(0, true) === 0x02014b50, 'ZIP 中央目录损坏');
      const flags = cv.getUint16(8, true);
      const method = cv.getUint16(10, true);
      need(method === 0, '当前版本只能读取PhonoLayer生成的无压缩 ZIP 容器');
      const expectedCrc = cv.getUint32(16, true);
      const compressedSize = cv.getUint32(20, true), size = cv.getUint32(24, true);
      need(compressedSize === size, '无压缩 ZIP 条目尺寸不一致');
      need(size <= MAX_ENTRY_BYTES, 'ZIP 条目过大');
      const nameLen = cv.getUint16(28, true), extraLen = cv.getUint16(30, true), commentLen = cv.getUint16(32, true);
      const localOffset = cv.getUint32(42, true);
      need(pos + 46 + nameLen + extraLen + commentLen <= centralEnd, 'ZIP 中央目录条目越界');
      let name;
      try { name = dec.decode(bytes.slice(pos + 46, pos + 46 + nameLen)); }
      catch { throw new Error('ZIP 文件名不是有效 UTF-8'); }
      need(!seen.has(name), `ZIP 存在重复文件名：${name}`); seen.add(name);
      const nameBytes = bytes.slice(pos + 46, pos + 46 + nameLen);
      if ((flags & 0x0800) === 0) need(!nameBytes.some(b => b >= 0x80), '未标记 UTF-8 的 ZIP 文件名只能使用 ASCII');
      need(localOffset + 30 <= bytes.length, 'ZIP 本地文件头越界');
      const lv = new DataView(bytes.buffer, bytes.byteOffset + localOffset, 30);
      need(lv.getUint32(0, true) === 0x04034b50, 'ZIP 本地文件头损坏');
      const localFlags = lv.getUint16(6, true), localMethod = lv.getUint16(8, true);
      need(localMethod === 0 && ((localFlags ^ flags) & 0x0800) === 0, 'ZIP 本地文件头编码/压缩方式不一致');
      const localCrc = lv.getUint32(14, true), localCompressedSize = lv.getUint32(18, true), localSize = lv.getUint32(22, true);
      need(localCrc === expectedCrc && localCompressedSize === compressedSize && localSize === size, 'ZIP 中央目录与本地文件头不一致');
      const localNameLen = lv.getUint16(26, true), localExtraLen = lv.getUint16(28, true);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      const dataEnd = dataStart + size;
      need(dataStart >= 0 && dataEnd <= bytes.length, 'ZIP 文件数据越界');
      const data = bytes.slice(dataStart, dataEnd);
      need(crc32(data) === expectedCrc, `ZIP CRC 校验失败：${name}`);
      files[name] = data;
      pos += 46 + nameLen + extraLen + commentLen;
    }
    need(pos === centralEnd, 'ZIP 中央目录长度不一致');
    return files;
  }

  function textFile(files, name) {
    if (!(name in files)) throw new Error(`存档缺少 ${name}`);
    try { return dec.decode(files[name]); }
    catch { throw new Error(`${name} 不是有效 UTF-8 文本`); }
  }

  function jsonFile(files, name) { return JSON.parse(textFile(files, name)); }

  return { crc32, packStoreZip, unpackStoreZip, textFile, jsonFile, MAX_ENTRY_BYTES, MAX_ARCHIVE_BYTES, MAX_ENTRIES };
});
