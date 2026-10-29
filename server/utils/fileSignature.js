const fs = require("fs");

// multer's fileFilter only sees the mimetype the BROWSER claims a file
// is — trivial to spoof (rename a .exe to .jpg, or send an
// application/pdf header on any file). This checks the file's actual
// first bytes against known signatures ("magic numbers") once it's on
// disk, so a renamed/spoofed upload gets caught and deleted instead of
// silently accepted.
//
// Returns true if the file's real bytes match one of the expected kinds.
const SIGNATURES = {
  jpeg: (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  png: (buf) => buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
  webp: (buf) =>
    buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP",
  pdf: (buf) => buf.slice(0, 5).toString("ascii") === "%PDF-",
};

const KINDS_BY_FIELD = {
  coverImage: ["jpeg", "png", "webp"],
  pdfFile: ["pdf"],
};

// filePath: absolute path to the saved file. field: "coverImage" | "pdfFile".
const isFileSignatureValid = (filePath, field) => {
  const allowedKinds = KINDS_BY_FIELD[field];
  if (!allowedKinds) return false;

  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    return allowedKinds.some((kind) => SIGNATURES[kind](buf));
  } catch (err) {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
};

// Same check, for a file that is still in memory (multer memoryStorage).
const isBufferSignatureValid = (buffer, field) => {
  const allowedKinds = KINDS_BY_FIELD[field];
  if (!allowedKinds || !buffer || buffer.length < 16) return false;
  const head = buffer.subarray(0, 16);
  return allowedKinds.some((kind) => SIGNATURES[kind](head));
};

module.exports = { isFileSignatureValid, isBufferSignatureValid };
