const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getPipelineById, getPipelineWithSteps, createPipeline, getAllPipelines, deletePipeline } = require('../models/pipeline');
const { getStepsByPipelineId, updateStep, insertStep, deleteStep } = require('../models/step');
const { getDetailsByStepId, insertDetail, updateDetail, deleteDetail } = require('../models/stepDynamicDetails');
const {
  getApplicantById,
  getApplicantsByPipeline,
  createApplicant,
  updateApplicantStep,
  updateApplicantNotes,
  updateApplicantData,
  insertApplicantHistory,
  getStepRequirements,
  checkDocument,
  getStepById,
  getApplicantDynamicDetails,
  setApplicantDynamicDetail,
  setApplicantDynamicDetails,
  checkRequiredDynamicDetailsFilled,
} = require('../models/applicant');

router.use(verifyToken);
router.use(requireRole(['ADMIN','Supervisor','CustomerService']));

// POST /api/admission/:id/steps
router.post('/:id/steps', async (req, res) => {
  const pipelineId = Number(req.params.id);
  const { name, slug, is_final } = req.body;

  if (!name || !slug) return res.status(400).json({ message: 'name and slug required' });

  try {
    const pipeline = await getPipelineById(pipelineId);
    if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });

    // Get current steps to calculate next ord
    const currentSteps = await getStepsByPipelineId(pipelineId);
    const nextOrd = currentSteps.length > 0 ? Math.max(...currentSteps.map(s => s.ord)) + 1 : 1;

    const result = await insertStep({ title: name, slug, ord: nextOrd, is_final, pipeline_id: pipelineId });
    // Fetch the inserted step
    const steps = await getStepsByPipelineId(pipelineId);
    const newStep = steps.find(s => s.id === result.lastID);
    res.status(201).json(newStep);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// PUT /api/admission/:id/steps
router.put('/:id/steps', async (req, res) => {
  const pipelineId = Number(req.params.id);
  const { steps } = req.body; // [{id,title,slug,is_final,ord}, ...]

  try {
    const pipeline = await getPipelineById(pipelineId);
    if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });

    for (const s of steps) {
      if (s.id) {
        await updateStep({ ...s, pipeline_id: pipelineId });
      } else {
        await insertStep({ ...s, pipeline_id: pipelineId });
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// PUT /api/admission/:id/steps/:stepId
router.put('/:id/steps/:stepId', async (req, res) => {
  const pipelineId = Number(req.params.id);
  const stepId = Number(req.params.stepId);
  const { title, slug, is_final } = req.body;

  if (!title || !slug) return res.status(400).json({ message: 'title and slug required' });

  try {
    const pipeline = await getPipelineById(pipelineId);
    if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });

    // Get current step to preserve ord
    const currentSteps = await getStepsByPipelineId(pipelineId);
    const currentStep = currentSteps.find(s => s.id === stepId);
    if (!currentStep) return res.status(404).json({ message: 'Step not found' });

    await updateStep({ id: stepId, title, slug, is_final, ord: currentStep.ord, pipeline_id: pipelineId });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/admission/:id/steps/:stepId
router.delete('/:id/steps/:stepId', async (req, res) => {
  const pipelineId = Number(req.params.id);
  const stepId = Number(req.params.stepId);

  try {
    const pipeline = await getPipelineById(pipelineId);
    if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });

    await deleteStep(stepId, pipelineId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});


// POST /api/admission/:id/move
router.post('/:id/move', async (req, res) => {
  const applicantId = Number(req.params.id);
  const { toStepId, note } = req.body;
  const adminId = req.user.id;

  try {
    const applicant = await getApplicantById(applicantId);
    if (!applicant) throw new Error('Applicant not found');

    const step = await getStepById(toStepId, applicant.pipeline_id);
    if (!step) throw new Error('Invalid step');

    // Check required documents
    const reqs = await getStepRequirements(toStepId);
    if (reqs.length) {
      const missing = [];
      for (const r of reqs) {
        const hasDoc = await checkDocument(applicantId, r.doc_key);
        if (!hasDoc) missing.push(r.doc_key);
      }
      if (missing.length) {
        const err = new Error('Dokumen wajib belum lengkap');
        err.missing = missing;
        throw err;
      }
    }

    // Check required dynamic details for the current step
    const dynamicCheck = await checkRequiredDynamicDetailsFilled(applicantId, applicant.current_step_id);
    if (dynamicCheck !== true) {
      const err = new Error('Dynamic details wajib belum lengkap');
      err.missing = dynamicCheck;
      throw err;
    }

    await updateApplicantStep(applicantId, toStepId);
    await insertApplicantHistory(applicantId, applicant.current_step_id, toStepId, adminId, note);

    res.json({ ok: true });
  } catch (e) {
    if (e.missing) return res.status(400).json({ message: e.message, missing: e.missing });
    res.status(400).json({ message: e.message });
  }
});

// GET /api/admission/pipelines
router.get('/pipelines', async (req, res) => {
  try {
    const pipelines = await getAllPipelines();
    res.json(pipelines);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// GET /api/admission/pipelines/:id
router.get('/pipelines/:id', async (req, res) => {
  try {
    const pipeline = await getPipelineWithSteps(req.params.id);
    if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });
    res.json(pipeline);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// GET /api/admission/applicants?pipelineId=...
router.delete('/:id/steps/:stepId', async (req, res) => {
  const pipelineId = Number(req.params.id);
  const stepId = Number(req.params.stepId);

  try {
    const pipeline = await getPipelineById(pipelineId);
    if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });

    await deleteStep(stepId, pipelineId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});


// POST /api/admission/:id/move
router.post('/:id/move', async (req, res) => {
  const applicantId = Number(req.params.id);
  const { toStepId, note } = req.body;
  const adminId = req.user.id;

  try {
    const applicant = await getApplicantById(applicantId);
    if (!applicant) throw new Error('Applicant not found');

    const step = await getStepById(toStepId, applicant.pipeline_id);
    if (!step) throw new Error('Invalid step');

    // Check required documents
    const reqs = await getStepRequirements(toStepId);
    if (reqs.length) {
      const missing = [];
      for (const r of reqs) {
        const hasDoc = await checkDocument(applicantId, r.doc_key);
        if (!hasDoc) missing.push(r.doc_key);
      }
      if (missing.length) {
        const err = new Error('Dokumen wajib belum lengkap');
        err.missing = missing;
        throw err;
      }
    }

    // Check required dynamic details for the current step
    const dynamicCheck = await checkRequiredDynamicDetailsFilled(applicantId, applicant.current_step_id);
    if (dynamicCheck !== true) {
      const err = new Error('Dynamic details wajib belum lengkap');
      err.missing = dynamicCheck;
      throw err;
    }

    await updateApplicantStep(applicantId, toStepId);
    await insertApplicantHistory(applicantId, applicant.current_step_id, toStepId, adminId, note);

    res.json({ ok: true });
  } catch (e) {
    if (e.missing) return res.status(400).json({ message: e.message, missing: e.missing });
    res.status(400).json({ message: e.message });
  }
});

// GET /api/admission/pipelines
router.get('/pipelines', async (req, res) => {
  try {
    const pipelines = await getAllPipelines();
    res.json(pipelines);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// GET /api/admission/pipelines/:id
router.get('/pipelines/:id', async (req, res) => {
  try {
    const pipeline = await getPipelineWithSteps(req.params.id);
    if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });
    res.json(pipeline);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// GET /api/admission/applicants?pipelineId=...
router.get('/applicants', async (req, res) => {
  const { pipelineId } = req.query;
  if (!pipelineId) return res.status(400).json({ message: 'pipelineId required' });
  try {
    const applicants = await getApplicantsByPipeline(pipelineId);
    res.json(applicants);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// POST /api/admission/pipelines
router.post('/pipelines', async (req, res) => {
  const { name, year } = req.body;
  if (!name || !year) return res.status(400).json({ message: 'name and year required' });
  try {
    const pipeline = await createPipeline({ name, year });
    res.status(201).json(pipeline);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/admission/pipelines/:id
router.delete('/pipelines/:id', async (req, res) => {
  const pipelineId = Number(req.params.id);

  try {
    await deletePipeline(pipelineId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

  // POST /api/admission/applicants
  router.post('/applicants', async (req, res) => {
    const { pipeline_id, name, nisn, birthdate, parent_phone, email, address } = req.body;
    if (!pipeline_id || !name) return res.status(400).json({ message: 'pipeline_id and name required' });
    try {
      const applicant = await createApplicant({ pipeline_id, name, nisn, birthdate, parent_phone, email, address });
      res.status(201).json(applicant);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  // GET /api/admission/applicants/:id/dynamic-details
  router.get('/applicants/:id/dynamic-details', async (req, res) => {
    const applicantId = Number(req.params.id);

    try {
      const details = await getApplicantDynamicDetails(applicantId);
      res.json(details);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  // POST /api/admission/applicants/:id/dynamic-details
  router.post('/applicants/:id/dynamic-details', async (req, res) => {
    const applicantId = Number(req.params.id);
    const { details } = req.body; // [{detail_key, value}, ...]

    try {
      await setApplicantDynamicDetails(applicantId, details);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  // PUT /api/admission/applicants/:id
  router.put('/applicants/:id', async (req, res) => {
    const applicantId = Number(req.params.id);
    const { name, nisn, birthdate, parent_phone, email, address, notes } = req.body;

    try {
      const applicant = await getApplicantById(applicantId);
      if (!applicant) return res.status(404).json({ message: 'Applicant not found' });

      await updateApplicantData(applicantId, { name, nisn, birthdate, parent_phone, email, address, notes });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  // GET /api/admission/:pipelineId/steps/:stepId/details
  router.get('/:pipelineId/steps/:stepId/details', async (req, res) => {
    const stepId = Number(req.params.stepId);
    try {
      const details = await getDetailsByStepId(stepId);
      res.json(details);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  // POST /api/admission/:pipelineId/steps/:stepId/details
  router.post('/:pipelineId/steps/:stepId/details', async (req, res) => {
    const stepId = Number(req.params.stepId);
    const { key, type, required, label, options } = req.body;
    if (!key || !type || !label) return res.status(400).json({ message: 'key, type, and label required' });

    try {
      const result = await insertDetail({ step_id: stepId, key, type, required, label, options });
      res.status(201).json({ id: result.lastID });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  // PUT /api/admission/:pipelineId/steps/:stepId/details/:detailId
  router.put('/:pipelineId/steps/:stepId/details/:detailId', async (req, res) => {
    const stepId = Number(req.params.stepId);
    const detailId = Number(req.params.detailId);
    const { key, type, required, label, options } = req.body;
    if (!key || !type || !label) return res.status(400).json({ message: 'key, type, and label required' });

    try {
      await updateDetail({ id: detailId, step_id: stepId, key, type, required, label, options });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  // DELETE /api/admission/:pipelineId/steps/:stepId/details/:detailId
  router.delete('/:pipelineId/steps/:stepId/details/:detailId', async (req, res) => {
    const stepId = Number(req.params.stepId);
    const detailId = Number(req.params.detailId);

    try {
      await deleteDetail(detailId, stepId);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  // POST /api/admission/auto-create-applicant
  router.post('/auto-create-applicant', async (req, res) => {
    const { pipelineId, customerName, customerPhone, customerEmail } = req.body;

    if (!pipelineId || !customerName) {
      return res.status(400).json({ message: 'pipelineId and customerName are required' });
    }

    try {
      // Get the first step of the pipeline
      const steps = await getStepsByPipelineId(pipelineId);
      if (!steps || steps.length === 0) {
        return res.status(400).json({ message: 'Pipeline has no steps' });
      }
      const firstStep = steps.find(s => s.ord === 1);
      if (!firstStep) {
        return res.status(400).json({ message: 'Pipeline has no first step' });
      }

      // Create applicant with queue data
      const applicant = await createApplicant({
        pipeline_id: pipelineId,
        current_step_id: firstStep.id,
        name: customerName,
        parent_phone: customerPhone,
        email: customerEmail,
        address: null,
        nisn: null,
        birthdate: null,
        notes: `Auto-created from queue service - ${new Date().toISOString()}`
      });

      res.status(201).json(applicant);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

module.exports = router;
