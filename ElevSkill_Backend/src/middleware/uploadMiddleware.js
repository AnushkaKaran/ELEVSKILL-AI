import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { env } from '../config/environment.js';
import { ApiError } from '../utils/ApiResponse.js';

export const TEMP_UPLOAD_DIR = path.join(env.backendRoot, 'storage', 'temporary');
export const PERMANENT_RESUME_DIR = path.join(env.backendRoot, 'storage', 'resumes');
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() === '.pdf' ? '.pdf' : '.pdf';
    const safeName = `tmp-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

function pdfFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  const isPdfMime = mime === 'application/pdf' || mime === 'application/x-pdf';
  if (ext !== '.pdf' || !isPdfMime) {
    return cb(new ApiError(400, 'Only PDF files (.pdf) are allowed.', 'INVALID_FILE_TYPE'));
  }
  return cb(null, true);
}

export const uploadResumePdf = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: MAX_PDF_BYTES,
    files: 1,
  },
});

export async function removeTempFile(filePath) {
  if (!filePath) return;
  try {
    const resolved = path.resolve(filePath);
    if (resolved.startsWith(path.resolve(TEMP_UPLOAD_DIR))) {
      await fs.unlink(resolved);
    }
  } catch {
    // ignore cleanup errors
  }
}

export async function promoteTempPdfToVault(tempFilePath, userId) {
  const resolvedTemp = path.resolve(tempFilePath);
  if (!resolvedTemp.startsWith(path.resolve(TEMP_UPLOAD_DIR))) {
    throw new ApiError(400, 'Invalid temporary file reference.', 'INVALID_FILE_PATH');
  }

  const storedFileName = `u${userId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.pdf`;
  const destPath = path.join(PERMANENT_RESUME_DIR, storedFileName);
  await fs.rename(resolvedTemp, destPath);
  return storedFileName;
}

export async function removeStoredResumeFile(storedFileName) {
  if (!storedFileName) return;
  const safeBase = path.basename(storedFileName);
  const fullPath = path.join(PERMANENT_RESUME_DIR, safeBase);
  try {
    await fs.unlink(fullPath);
  } catch {
    // ignore if already deleted
  }
}

export function resolveStoredResumePath(storedFileName) {
  if (!storedFileName) return null;
  const safeBase = path.basename(storedFileName);
  return path.join(PERMANENT_RESUME_DIR, safeBase);
}
