/**
 * VYAVSAYMITRA — SECURE DOCUMENT VAULT CONTROLLER (PHASE 8)
 * 
 * Manages authenticated document lifecycle: secure uploads, multi-versioning,
 * previews/downloads, status transitions (uploaded -> under_review -> verified/rejected),
 * and audit timeline logging with strict multi-tenant IDOR protection.
 */

const dbRepository = require('../models/dbRepository');
const storageService = require('../services/storageService');
const actionPlanService = require('../services/actionPlanService');

async function getAuthorizedBusiness(businessId, userId) {
  if (!businessId || typeof businessId !== 'string') return null;
  return await dbRepository.getBusiness(businessId, userId);
}

// ── 1. LIST DOCUMENTS ────────────────────────────────────────────────────────
exports.listDocuments = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    // Seed default template documents if business checklist is completely empty
    await actionPlanService.seedDefaultDocumentsIfEmpty(businessId, business.domain);

    const documents = await dbRepository.listBusinessDocuments(businessId);

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    if (!isNaN(page) || !isNaN(limit)) {
      const { paginate } = require('../services/executionIntelligence');
      const paginated = paginate(documents, page || 1, limit || 20);
      return res.json({
        success: true,
        data: {
          businessId,
          documents: paginated.items
        },
        pagination: paginated.pagination
      });
    }

    res.json({
      success: true,
      data: {
        businessId,
        documents
      },
      documents,
      count: documents.length
    });
  } catch (err) {
    next(err);
  }
};

// ── 2. UPLOAD / REPLACE DOCUMENT ─────────────────────────────────────────────
exports.uploadDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const {
      documentType,
      document_type,
      documentName,
      document_name,
      fileName,
      file_name,
      mimeType,
      mime_type,
      fileData,
      notes
    } = req.body;

    const docType = documentType || document_type;
    const origFileName = fileName || file_name;
    const detectedMime = mimeType || mime_type;

    if (!docType || typeof docType !== 'string') {
      return res.status(400).json({ success: false, message: 'Document type is required.' });
    }

    if (!origFileName || typeof origFileName !== 'string' || !origFileName.trim()) {
      return res.status(400).json({ success: false, message: 'File name is required.' });
    }

    if (!fileData) {
      return res.status(400).json({ success: false, message: 'File payload is required.' });
    }

    // Convert fileData to binary buffer
    let buffer;
    if (Buffer.isBuffer(fileData)) {
      buffer = fileData;
    } else if (typeof fileData === 'string') {
      // Clean base64 string if data URI scheme was attached
      const cleanBase64 = fileData.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    } else {
      return res.status(400).json({ success: false, message: 'Invalid file data format.' });
    }

    // Validate size and format through storage service
    try {
      storageService.validateFile({
        fileName: origFileName,
        mimeType: detectedMime,
        fileSize: buffer.length,
        buffer
      });
    } catch (valErr) {
      return res.status(400).json({
        success: false,
        errorCode: valErr.code || 'VALIDATION_ERROR',
        code: valErr.code || 'VALIDATION_ERROR',
        message: valErr.message
      });
    }

    // Check if document entity already exists for business
    let doc = await dbRepository.getDocumentById(businessId, docType);
    const isReplacement = Boolean(doc && doc.storage_path);
    const nextVersion = isReplacement ? ((Number(doc.version_number) || 1) + 1) : 1;

    // Save physical file via storage service
    const tempDocId = doc ? doc.id : docType;
    const saveResult = await storageService.saveFile({
      businessId,
      documentId: tempDocId,
      versionNumber: nextVersion,
      fileName: origFileName,
      mimeType: detectedMime,
      buffer
    });

    const now = new Date().toISOString();

    // Check for duplicate content across this business
    const existingDuplicate = await dbRepository.findDocumentByChecksum(businessId, saveResult.checksum);
    const isDuplicateContent = Boolean(existingDuplicate && existingDuplicate.id !== (doc ? doc.id : null));

    if (!doc) {
      // Create new document record
      doc = await dbRepository.upsertBusinessDocument(businessId, {
        document_name: documentName || document_name || origFileName.replace(/\.[^/.]+$/, ''),
        document_type: docType,
        status: 'uploaded',
        source: 'user',
        notes: notes || '',
        user_id: userId,
        file_name: saveResult.fileName,
        storage_path: saveResult.storagePath,
        mime_type: saveResult.mimeType,
        file_size: saveResult.fileSize,
        checksum: saveResult.checksum,
        version_number: 1,
        uploaded_at: now
      });
    } else {
      // Update existing document record
      doc = await dbRepository.updateBusinessDocument(businessId, doc.id, {
        file_name: saveResult.fileName,
        storage_path: saveResult.storagePath,
        mime_type: saveResult.mimeType,
        file_size: saveResult.fileSize,
        checksum: saveResult.checksum,
        version_number: nextVersion,
        status: 'uploaded',
        notes: notes !== undefined ? notes : doc.notes,
        uploaded_at: now,
        rejection_reason: null
      });
    }

    // Archive immutable version record
    const versionRecord = await dbRepository.createDocumentVersion(businessId, doc.id, {
      version_number: nextVersion,
      file_name: saveResult.fileName,
      storage_path: saveResult.storagePath,
      mime_type: saveResult.mimeType,
      file_size: saveResult.fileSize,
      checksum: saveResult.checksum,
      uploaded_by: userId,
      status: 'uploaded',
      verification_note: notes || ''
    });

    // Write audit timeline event
    const eventType = isReplacement ? 'DOCUMENT_REPLACED' : 'DOCUMENT_UPLOADED';
    const eventTitle = isReplacement ? `Document Replaced (v${nextVersion}): ${doc.document_name}` : `Document Uploaded: ${doc.document_name}`;
    await dbRepository.createTimelineEvent(businessId, {
      eventType,
      title: eventTitle,
      description: `Uploaded ${saveResult.fileName} (${Math.round(saveResult.fileSize / 1024)} KB) under ${doc.document_name}.`,
      metadata: {
        documentId: doc.id,
        documentType: doc.document_type,
        versionNumber: nextVersion,
        fileSize: saveResult.fileSize,
        checksum: saveResult.checksum
      }
    });

    res.status(201).json({
      success: true,
      message: isReplacement ? `Document replaced with version ${nextVersion}.` : 'Document uploaded successfully.',
      data: {
        document: doc,
        version: versionRecord,
        checksum: saveResult.checksum,
        isDuplicate: isDuplicateContent,
        duplicateOf: isDuplicateContent ? existingDuplicate.id : null
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── 3. GET DOCUMENT METADATA ──────────────────────────────────────────────────
exports.getDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const documentId = req.params.documentId || req.params.docId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const versions = await dbRepository.listDocumentVersions(businessId, doc.id);

    res.json({
      success: true,
      data: {
        ...doc,
        versions
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── 4. PREVIEW DOCUMENT ───────────────────────────────────────────────────────
exports.previewDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const documentId = req.params.documentId || req.params.docId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc || !doc.storage_path) {
      return res.status(404).json({ success: false, message: 'Document file not found.' });
    }

    const file = await storageService.getFile(doc.storage_path);
    if (!file) {
      return res.status(404).json({ success: false, message: 'Underlying document storage file not found.' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name || 'document'}"`);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Cache-Control', 'private, no-cache');
    res.send(file.buffer);
  } catch (err) {
    next(err);
  }
};

// ── 5. DOWNLOAD DOCUMENT ──────────────────────────────────────────────────────
exports.downloadDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const documentId = req.params.documentId || req.params.docId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc || !doc.storage_path) {
      return res.status(404).json({ success: false, message: 'Document file not found.' });
    }

    const file = await storageService.getFile(doc.storage_path);
    if (!file) {
      return res.status(404).json({ success: false, message: 'Underlying document storage file not found.' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name || 'document'}"`);
    res.setHeader('Content-Length', file.fileSize);
    res.send(file.buffer);
  } catch (err) {
    next(err);
  }
};

// ── 6. UPDATE DOCUMENT STATUS / VERIFICATION ─────────────────────────────────
exports.updateDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const documentId = req.params.documentId || req.params.docId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const { status, notes, rejection_reason, rejectionReason, verification_note, verificationNote } = req.body;
    const validStatuses = ['missing', 'provided', 'uploaded', 'under_review', 'verified', 'rejected', 'not_required'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document status. Allowed: ${validStatuses.join(', ')}`
      });
    }

    const now = new Date().toISOString();
    const isVerified = status === 'verified';
    const isRejected = status === 'rejected';

    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (verification_note || verificationNote) updates.notes = verification_note || verificationNote;

    if (isVerified) {
      updates.verified_at = now;
      updates.verified_by = userId;
      updates.rejection_reason = null;
    } else if (isRejected) {
      updates.rejection_reason = rejection_reason || rejectionReason || 'Document did not meet verification criteria.';
    }

    const updated = await dbRepository.updateBusinessDocument(businessId, doc.id, updates);

    // Audit Timeline logging
    let eventType = 'DOCUMENT_STATUS_CHANGED';
    let eventTitle = `Document Status Updated: ${doc.document_name}`;
    if (isVerified) {
      eventType = 'DOCUMENT_VERIFIED';
      eventTitle = `Document Verified: ${doc.document_name}`;
    } else if (isRejected) {
      eventType = 'DOCUMENT_REJECTED';
      eventTitle = `Document Rejected: ${doc.document_name}`;

      // Create high-priority notification for user regarding document rejection
      await dbRepository.createNotification(userId, {
        title: `Document Rejected: ${doc.document_name}`,
        message: `${business.name}: ${updates.rejection_reason}`,
        type: 'WARNING',
        category: 'DOCUMENT',
        action_url: `/businesses/${businessId}?tab=documents&doc=${doc.id}`
      });
    }

    await dbRepository.createTimelineEvent(businessId, {
      eventType,
      title: eventTitle,
      description: updates.rejection_reason || updates.notes || `Status changed to ${status}.`,
      metadata: { documentId: doc.id, status, rejectionReason: updates.rejection_reason }
    });

    res.json({
      success: true,
      message: `Document status updated to ${status || doc.status}.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

// ── 7. DELETE DOCUMENT ────────────────────────────────────────────────────────
exports.deleteDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const documentId = req.params.documentId || req.params.docId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Clean up physical file
    if (doc.storage_path) {
      await storageService.deleteFile(doc.storage_path);
    }

    await dbRepository.deleteBusinessDocument(businessId, doc.id);

    await dbRepository.createTimelineEvent(businessId, {
      eventType: 'DOCUMENT_DELETED',
      title: `Document Deleted: ${doc.document_name}`,
      description: `Removed ${doc.document_name} from document repository.`,
      metadata: { documentId: doc.id }
    });

    res.json({
      success: true,
      message: 'Document deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// ── 8. LIST DOCUMENT VERSIONS ────────────────────────────────────────────────
exports.listVersions = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const documentId = req.params.documentId || req.params.docId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const versions = await dbRepository.listDocumentVersions(businessId, doc.id);

    res.json({
      success: true,
      data: {
        documentId: doc.id,
        currentVersion: doc.version_number,
        versions
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.listDocumentVersions = exports.listVersions;
