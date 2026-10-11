const express = require('express');
const router = express.Router();
router.use(require('./users-management.routes'));
router.use(require('./roles-suggestions.routes'));
router.use(require('./profile.routes'));
router.use(require('./hospital-profile.routes'));
router.use(require('./org-structure.routes'));
module.exports = router;
