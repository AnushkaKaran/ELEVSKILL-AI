import { Router } from 'express';
import {
  analyzeResume,
  createDraft,
  createVaultResume,
  downloadVaultResumePdf,
  extractPdf,
  getAnalysisHistory,
  getDrafts,
  getResume,
  listResumes,
  patchDraft,
  patchVaultResume,
  removeVaultResume,
} from '../controllers/resumeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { uploadResumePdf } from '../middleware/uploadMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import {
  analyzeResumeValidator,
  saveDraftValidator,
  saveResumeValidator,
  updateResumeValidator,
} from '../validators/resumeValidators.js';

const router = Router();

router.use(requireAuth);

router.post('/extract-pdf', uploadResumePdf.single('file'), extractPdf);
router.post('/analyze', analyzeResumeValidator, validateRequest, analyzeResume);
router.get('/analyses', getAnalysisHistory);

router.get('/drafts', getDrafts);
router.post('/drafts', saveDraftValidator, validateRequest, createDraft);
router.put('/drafts/:draftId', patchDraft);
router.patch('/drafts/:draftId', patchDraft);

router.get('/', listResumes);
router.post('/', saveResumeValidator, validateRequest, createVaultResume);
router.get('/:id', getResume);
router.put('/:id', updateResumeValidator, validateRequest, patchVaultResume);
router.patch('/:id', updateResumeValidator, validateRequest, patchVaultResume);
router.delete('/:id', removeVaultResume);
router.get('/:id/download', downloadVaultResumePdf);

export default router;
