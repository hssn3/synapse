const express = require('express');
const router = express.Router();
router.use(require('./dashboard.routes'));
router.use(require('./reports.routes'));
router.use(require('./evidence-upload.routes'));
router.use(require('./public.routes'));
router.use(require('./assistant-legacy.routes'));
module.exports = router;
