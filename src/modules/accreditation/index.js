const express = require('express');
const router = express.Router();
router.use(require('./tree.routes'));
router.use(require('./corrective-actions.routes'));
router.use(require('./overrides.routes'));
router.use(require('./timeline.routes'));
router.use(require('./gap-analysis.routes'));
module.exports = router;
