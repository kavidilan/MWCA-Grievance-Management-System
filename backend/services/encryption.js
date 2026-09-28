const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Derive a 32-byte key using SHA-256 over secret
const rawSecret = process.env.STORAGE_ENCRYPTION_KEY || process.env.AUTH_SECRET || 'mwca-secure-default-encryption-key-2026';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(rawSecret).digest();

const ALGORITHM = 'aes-256-gcm';

// Magic byte definitions for allowed document types
const MAGIC_SIGNATURES = [
  { ext: 'pdf', header: [0x25, 0x50, 0x44, 0x46] },             // %PDF
  { ext: 'png', header: [0x89, 0x50, 0x4E, 0x47] },             // .PNG
  { ext: 'jpg', header: [0xFF, 0xD8, 0xFF] },                   // .JPG
  { ext: 'zip_or_docx', header: [0x50, 0x4B, 0x03, 0x04] },      // .ZIP / .DOCX / .XLSX
  { ext: 'txt', header: [] }                                    // Text files
];

const DISALLOWED_EXTENSIONS = /\.(exe|bat|cmd|sh|php|js|vbs|ps1|html|htm|svg|jar|msi|scr|dll)$/i;

function sanitizeFilename(filename) {
  if (!filename) return 'unnamed_document';
  // Strip path separators, null bytes, and control characters
  return String(filename)
    .replace(/[\/\x00-\x1f\x7f-\x9f\:\\\*\?\"\<\>\|]/g, '_')
    .replace(/\.\./g, '_')
    .trim();
}

function validateFile(buffer, filename) {
  const cleanName = sanitizeFilename(filename);
  if (DISALLOWED_EXTENSIONS.test(cleanName)) {
    throw new Error(`Security Violation: File type '${path.extname(cleanName)}' is strictly prohibited for security reasons.`);
  }

  // Check magic bytes for known binary types if buffer is provided
  if (buffer && buffer.length >= 4) {
    const isDocxOrZip = cleanName.endsWith('.docx') || cleanName.endsWith('.xlsx') || cleanName.endsWith('.zip');
    const isPdf = cleanName.endsWith('.pdf');
    const isPng = cleanName.endsWith('.png');
    const isJpg = cleanName.endsWith('.jpg') || cleanName.endsWith('.jpeg');

    if (isPdf && !buffer.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
      throw new Error('Security Violation: File content does not match genuine PDF binary header.');
    }
    if (isPng && !buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47]))) {
      throw new Error('Security Violation: File content does not match genuine PNG binary header.');
    }
    if (isJpg && !buffer.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) {
      throw new Error('Security Violation: File content does not match genuine JPEG binary header.');
    }
    if (isDocxOrZip && !buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) {
      throw new Error('Security Violation: File content does not match genuine OpenXML/ZIP binary header.');
    }
  }

  return cleanName;
}

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Format: IV (12B) + AuthTag (16B) + Encrypted Ciphertext
  return Buffer.concat([iv, authTag, encrypted]);
}

function decryptBuffer(encryptedBuffer) {
  const iv = encryptedBuffer.subarray(0, 12);
  const authTag = encryptedBuffer.subarray(12, 28);
  const ciphertext = encryptedBuffer.subarray(28);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function encryptAttachment(attachment) {
  if (!attachment) return null;

  let buffer = null;
  let contentType = attachment.contentType || attachment.type || 'application/octet-stream';
  const cleanName = sanitizeFilename(attachment.name || attachment.filename || 'attachment');

  if (attachment.dataUrl) {
    const match = String(attachment.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contentType = match[1];
      buffer = Buffer.from(match[2], 'base64');
    }
  } else if (attachment.content && Buffer.isBuffer(attachment.content)) {
    buffer = attachment.content;
  } else if (attachment.content && typeof attachment.content === 'string') {
    buffer = Buffer.from(attachment.content, 'base64');
  }

  if (!buffer || !buffer.length) {
    return null;
  }

  // Validate magic bytes and disallowed file types
  validateFile(buffer, cleanName);

  // Encrypt file using AES-256-GCM
  const encryptedPayload = encryptBuffer(buffer);
  const fileId = `enc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.dat`;
  const fullPath = path.join(UPLOADS_DIR, fileId);

  fs.writeFileSync(fullPath, encryptedPayload);

  return {
    id: fileId,
    name: cleanName,
    size: attachment.size || `${(buffer.length / 1024).toFixed(1)} KB`,
    contentType: contentType,
    storedPath: fileId,
    isEncrypted: true,
    uploadedAt: new Date().toISOString()
  };
}

function decryptAttachment(metaObj) {
  if (!metaObj) return null;

  // Case 1: Encrypted file stored on disk
  if (metaObj.storedPath) {
    const fullPath = path.join(UPLOADS_DIR, metaObj.storedPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File '${metaObj.name}' not found in secure storage repository.`);
    }
    const encryptedData = fs.readFileSync(fullPath);
    const decryptedBuffer = decryptBuffer(encryptedData);
    return {
      name: metaObj.name,
      contentType: metaObj.contentType || 'application/octet-stream',
      buffer: decryptedBuffer
    };
  }

  // Case 2: Legacy fallback for existing Base64 records
  if (metaObj.dataUrl) {
    const match = String(metaObj.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return {
        name: metaObj.name || 'document',
        contentType: match[1],
        buffer: Buffer.from(match[2], 'base64')
      };
    }
  }

  return null;
}

module.exports = {
  sanitizeFilename,
  validateFile,
  encryptBuffer,
  decryptBuffer,
  encryptAttachment,
  decryptAttachment
};
