/**
 * VYAVSAYMITRA — SECURE DOCUMENT STORAGE SERVICE (PHASE 8)
 * 
 * Secure document storage abstraction with strict MIME/extension validation,
 * size boundaries, path traversal guards, and safe key generation.
 * Supports filesystem sandbox storage with Supabase Storage readiness.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Strict allowed file types
const ALLOWED_MIME_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png'
};

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

// Maximum file size: 10 Megabytes
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Base storage directory
const STORAGE_ROOT = path.resolve(__dirname, '../../data/storage');

function ensureStorageDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Sanitizes user-provided filename to prevent path traversal or filesystem attacks.
 * @param {string} originalName 
 * @returns {string} Safe filename
 */
function sanitizeFileName(originalName) {
  if (!originalName || typeof originalName !== 'string') return 'document';
  // Strip path separators, directory traversal sequences, and control characters
  const base = path.basename(originalName).replace(/[^\w\.\-\s]/gi, '_').trim();
  return base.substring(0, 100) || 'document';
}

class StorageService {
  constructor() {
    ensureStorageDir(STORAGE_ROOT);
  }

  /**
   * Validates file metadata and binary integrity
   */
  validateFile({ fileName, mimeType, fileSize, buffer }) {
    if (!mimeType || !ALLOWED_MIME_TYPES[mimeType.toLowerCase()]) {
      const err = new Error(`Unsupported document type (${mimeType || 'unknown'}). Allowed formats: PDF, JPG, PNG.`);
      err.code = 'INVALID_FILE_TYPE';
      throw err;
    }

    const ext = path.extname(fileName || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const err = new Error(`File extension (${ext}) does not match permitted document types (.pdf, .jpg, .jpeg, .png).`);
      err.code = 'INVALID_FILE_TYPE';
      throw err;
    }

    const size = fileSize || (buffer ? buffer.length : 0);
    if (size > MAX_FILE_SIZE_BYTES) {
      const err = new Error(`Document size (${Math.round(size / 1024 / 1024 * 10) / 10}MB) exceeds 10MB maximum limit.`);
      err.code = 'DOCUMENT_TOO_LARGE';
      throw err;
    }

    if (size === 0) {
      const err = new Error('Empty document file provided.');
      err.code = 'DOCUMENT_EMPTY';
      throw err;
    }

    return true;
  }

  /**
   * Calculates SHA-256 cryptographic checksum of buffer
   * @param {Buffer} buffer
   * @returns {string} Hexadecimal SHA-256 checksum
   */
  calculateChecksum(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer)) return null;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Validates that targetPath is safe and strictly inside storage sandbox
   */
  isSafeStoragePath(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') return false;
    if (targetPath.includes('..')) return false;
    const resolved = path.resolve(STORAGE_ROOT, targetPath);
    return resolved.startsWith(STORAGE_ROOT);
  }

  /**
   * Securely saves document binary to storage.
   * Generates opaque, unguessable storage identifier.
   */
  async saveFile({ businessId, documentId, versionNumber = 1, fileName, mimeType, buffer }) {
    this.validateFile({ fileName, mimeType, fileSize: buffer?.length, buffer });

    const safeName = sanitizeFileName(fileName);
    const ext = path.extname(safeName).toLowerCase() || ALLOWED_MIME_TYPES[mimeType.toLowerCase()] || '.bin';
    const checksum = this.calculateChecksum(buffer);
    
    // Generate secure random key
    const uniqueKey = crypto.randomBytes(16).toString('hex');
    const relativeKey = path.join(String(businessId), `${documentId}_v${versionNumber}_${uniqueKey}${ext}`).replace(/\\/g, '/');
    const absolutePath = path.resolve(STORAGE_ROOT, relativeKey);

    // Path traversal check: absolute path MUST be strictly inside STORAGE_ROOT
    if (!absolutePath.startsWith(STORAGE_ROOT)) {
      const err = new Error('Invalid storage path calculation.');
      err.code = 'STORAGE_PATH_TRAVERSAL';
      throw err;
    }

    ensureStorageDir(path.dirname(absolutePath));
    await fs.promises.writeFile(absolutePath, buffer);

    return {
      storagePath: relativeKey,
      fileName: safeName,
      mimeType: mimeType.toLowerCase(),
      fileSize: buffer.length,
      checksum,
      success: true
    };
  }

  /**
   * Reads stored document binary
   */
  async getFile(storagePath) {
    if (!storagePath || typeof storagePath !== 'string') return null;

    const absolutePath = path.resolve(STORAGE_ROOT, storagePath);
    if (!absolutePath.startsWith(STORAGE_ROOT)) {
      const err = new Error('Invalid storage access request.');
      err.code = 'STORAGE_ACCESS_DENIED';
      throw err;
    }

    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    const buffer = await fs.promises.readFile(absolutePath);
    const ext = path.extname(storagePath).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';

    return {
      buffer,
      mimeType,
      fileSize: buffer.length
    };
  }

  /**
   * Removes document from storage
   */
  async deleteFile(storagePath) {
    if (!storagePath || typeof storagePath !== 'string') return false;

    const absolutePath = path.resolve(STORAGE_ROOT, storagePath);
    if (!absolutePath.startsWith(STORAGE_ROOT)) return false;

    if (fs.existsSync(absolutePath)) {
      try {
        await fs.promises.unlink(absolutePath);
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }
}

module.exports = new StorageService();
