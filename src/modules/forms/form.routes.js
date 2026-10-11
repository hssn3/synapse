/**
 * Enterprise Form Engine API Routes
 * Fully protected by authorize(resource, action) middleware.
 */
const express = require('express');
const router = express.Router();
const { authRequired } = require('../../middleware/auth');
const { authorize } = require('../rbac/authorize.middleware');
const formController = require('./form.controller');

// فهرست فرم‌های بیمارستان
router.get('/', authRequired, (req, res, next) => formController.listForms(req, res, next));

// ایجاد فرم جدید (نیازمند مجوز طراحی فرم)
router.post('/', authRequired, authorize('form_engine:schema', 'create'), (req, res, next) => formController.createForm(req, res, next));

// دریافت ساختار و اسکیمای یک فرم (جهت رندر پویا در فرانت‌اند)
router.get('/:idOrSlug', authRequired, authorize(req => req.params.idOrSlug, 'view'), (req, res, next) => formController.getForm(req, res, next));

// ثبت نسخه جدید اسکیمای فرم
router.post('/:id/versions', authRequired, authorize('form_engine:schema', 'edit'), (req, res, next) => formController.createVersion(req, res, next));

// دریافت و ویرایش ماتریس دسترسی فرم
router.get('/:id/permissions', authRequired, authorize('form_engine:permissions', 'manage'), (req, res, next) => formController.getForm(req, res, next));
router.put('/:id/permissions', authRequired, authorize('form_engine:permissions', 'manage'), (req, res, next) => formController.updatePermissions(req, res, next));

// ثبت داده فرم (نیازمند مجوز fill روی همان فرم)
router.post('/:id/submit', authRequired, authorize(req => req.params.id, 'fill'), (req, res, next) => formController.submit(req, res, next));

// مشاهده سوابق ثبت‌شده (نیازمند مجوز view)
router.get('/:id/submissions', authRequired, authorize(req => req.params.id, 'view'), (req, res, next) => formController.getSubmissions(req, res, next));

// تایید یا رد پاسخ فرم در گردش کار (نیازمند مجوز approve)
router.post('/:id/submissions/:subId/review', authRequired, authorize(req => req.params.id, 'approve'), (req, res, next) => formController.review(req, res, next));

module.exports = router;
