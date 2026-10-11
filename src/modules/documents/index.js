const express = require('express');
const router = express.Router();
router.use(require('./controlled-docs.routes'));
router.use(require('./signatures.routes'));
router.use(require('./library.routes'));
router.use(require('./processes.routes'));
router.use(require('./evidence.routes'));
module.exports = router;
