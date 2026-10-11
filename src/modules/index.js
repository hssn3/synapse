/**
 * Enterprise Domain Modules Aggregator
 * Mounts all bounded context routers cleanly.
 * Zero monolithic routes. Clean Architecture.
 */
const express = require('express');
const router = express.Router();

router.use(require('./core'));
router.use(require('./accreditation'));
router.use(require('./documents'));
router.use(require('./collaboration'));
router.use(require('./quality'));
router.use(require('./clinical'));
router.use(require('./operations'));
router.use(require('./users'));
router.use('/rbac', require('./rbac/rbac.routes'));
router.use('/forms', require('./forms/form.routes'));
router.use('/assistant-enterprise', require('./assistant/assistant.routes'));

module.exports = router;
