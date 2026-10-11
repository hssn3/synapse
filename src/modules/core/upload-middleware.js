/**
 * File Upload & Compression Middleware (Multer + Sharp)
 */
const multer = require('multer');
const sharp = require('sharp');
const config = require('../../config/app');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSize || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      const err = new Error('نوع فایل مجاز نیست (فقط JPG/PNG/WEBP/PDF)');
      err.status = 400;
      err.isUploadValidation = true;
      return cb(err);
    }
    cb(null, true);
  },
});

async function compressImage(buffer, filePath) {
  try {
    await sharp(buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(filePath);
  } catch (e) {
    const err = new Error('محتوای فایل یک تصویر معتبر نیست');
    err.status = 400;
    err.isUploadValidation = true;
    throw err;
  }
}

const uploadSingle = (field) => (req, res, next) => {
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    if (err.isUploadValidation) return res.status(400).json({ error: err.message });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'حجم فایل بیش از حد مجاز است' });
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'فیلد فایل نامعتبر است' });
    if (err instanceof multer.MulterError) return res.status(400).json({ error: 'خطا در دریافت فایل' });
    next(err);
  });
};

const uploadMultiple = (field, max) => (req, res, next) => {
  upload.array(field, max || 8)(req, res, (err) => {
    if (!err) return next();
    if (err.isUploadValidation) return res.status(400).json({ error: err.message });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'حجم فایل بیش از حد مجاز است' });
    if (err instanceof multer.MulterError) return res.status(400).json({ error: 'خطا در دریافت فایل' });
    next(err);
  });
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  compressImage
};
