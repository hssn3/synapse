const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../public/css/indicator-slides.css');
let css = fs.readFileSync(cssPath, 'utf8');

const additionalCss = `
/* ==================== KPI Executive Summary Cards ==================== */
.islide-kpi-summary-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  width: 100%;
  margin-bottom: 4px;
}

.islide-kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%);
  border: 1px solid rgba(148, 163, 184, 0.15);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.islide-kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--kpi-col, #38bdf8);
}

.islide-kpi-card .kpi-icon {
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.islide-kpi-card .kpi-body {
  flex: 1;
}

.islide-kpi-card .kpi-title {
  font-size: 12.5px;
  color: #94a3b8;
  font-weight: 600;
  margin-bottom: 2px;
}

.islide-kpi-card .kpi-val {
  font-size: 20px;
  font-weight: 800;
  color: var(--kpi-col, #f8fafc);
  font-family: inherit;
}

.islide-kpi-card .kpi-unit {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
}

.islide-kpi-card .kpi-sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

/* ==================== Slide 1 Cover Hero ==================== */
.islide-cover-hero {
  padding: 44px 32px;
  text-align: center;
  background: radial-gradient(circle at center top, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0.7) 70%);
  border-radius: 14px;
}

.cover-badge {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 20px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  font-size: 12.5px;
  font-weight: 700;
  margin-bottom: 16px;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.cover-title {
  font-size: 32px;
  font-weight: 900;
  color: #f8fafc;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.cover-years {
  font-size: 18px;
  font-weight: 600;
  color: #f59e0b;
  margin: 0 0 16px 0;
}

.cover-desc {
  max-width: 680px;
  margin: 0 auto 32px;
  font-size: 14px;
  line-height: 1.8;
  color: #cbd5e1;
}

.cover-sections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  max-width: 900px;
  margin: 0 auto 32px;
}

.cover-sec-item {
  padding: 16px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
}

.cover-sec-item:hover {
  transform: translateY(-3px);
  border-color: var(--c-col, #38bdf8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.cover-sec-item .cs-icon {
  font-size: 24px;
  margin-bottom: 6px;
}

.cover-sec-item .cs-title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 4px;
}

.cover-sec-item .cs-count {
  font-size: 12px;
  color: var(--c-col, #38bdf8);
  font-weight: 600;
}

.cover-action-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ==================== Insights Row (Analysis & Corrective) ==================== */
.islide-insights-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
  margin-top: 14px;
  width: 100%;
}

.islide-insight-card {
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(8px);
}

.islide-insight-card.analysis {
  border-left: 4px solid #38bdf8;
}

.islide-insight-card.corrective {
  border-left: 4px solid #f59e0b;
  background: rgba(245, 158, 11, 0.06);
}

.islide-insight-card .ins-title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 6px;
}

.islide-insight-card .ins-body {
  font-size: 13px;
  line-height: 1.7;
  color: #cbd5e1;
}

/* ==================== Table Styles ==================== */
.islide-table-section {
  margin-top: 20px;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  padding: 18px;
}

.islide-table-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.islide-table-hd .hd-title {
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
}

.islide-table-hd .sub-txt {
  font-size: 12px;
  color: #94a3b8;
  margin-left: 8px;
}

.islide-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
  font-size: 13px;
}

.islide-table th {
  padding: 10px 14px;
  background: rgba(30, 41, 59, 0.8);
  color: #cbd5e1;
  font-weight: 700;
  border-bottom: 2px solid rgba(148, 163, 184, 0.2);
}

.islide-table td {
  padding: 9px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  color: #e2e8f0;
}

.islide-table tr:hover td {
  background: rgba(56, 189, 248, 0.04);
}

.islide-table .tr-summary td {
  background: rgba(56, 189, 248, 0.08);
  font-weight: 700;
  color: #38bdf8;
  border-top: 1px solid rgba(56, 189, 248, 0.2);
  border-bottom: 1px solid rgba(56, 189, 248, 0.2);
}

.islide-table .td-period {
  font-weight: 600;
}

.islide-table .td-val {
  font-family: monospace, sans-serif;
  font-size: 13.5px;
}

.val-1404 {
  color: #38bdf8;
}

.val-1405 {
  color: #f59e0b;
}

.diff-up {
  color: #10b981;
  font-weight: 700;
}

.diff-down {
  color: #ef4444;
  font-weight: 700;
}

/* ==================== Grid View Styles ==================== */
.islide-grid-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.islide-grid-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: #cbd5e1;
}

.islide-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.islide-grid-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%);
  border: 1px solid rgba(148, 163, 184, 0.15);
  cursor: pointer;
  min-height: 140px;
  transition: all 0.2s ease;
}

.islide-grid-card:hover {
  transform: translateY(-2px);
  border-color: var(--card-border, #38bdf8);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
}

.islide-grid-card .card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.islide-grid-card .card-sec-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}

.islide-grid-card .card-num-badge {
  font-size: 11px;
  color: #64748b;
  font-weight: 700;
}

.islide-grid-card .card-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.45;
  margin: 0 0 6px 0;
  flex: 1;
}

.islide-grid-card .card-sub {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 10px;
}

.islide-grid-card .card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  padding-top: 10px;
}

.islide-grid-card .card-stat {
  font-size: 12px;
  color: #94a3b8;
}

.islide-grid-card .card-stat .val {
  color: #38bdf8;
  font-weight: 600;
  margin-right: 4px;
}

/* ==================== Excel Grid Editor Styles ==================== */
.islide-editor-container {
  padding: 24px;
  border-radius: 14px;
}

.editor-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
}

.editor-select-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor-select-box select {
  max-width: 420px;
  padding: 8px 14px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #f8fafc;
  font-size: 13px;
}

.editor-quick-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor-quick-info .badge {
  padding: 4px 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 12px;
}

.editor-quick-info .unit-tag {
  color: #94a3b8;
  font-size: 12.5px;
}

.sheet-title-row {
  margin-bottom: 16px;
}

.sheet-title-row h3 {
  font-size: 18px;
  color: #38bdf8;
  margin: 0 0 4px 0;
}

.sheet-title-row p {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.islide-editor-table input.form-ctrl {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-family: monospace, sans-serif;
  width: 100%;
}

.islide-editor-table .input-readonly {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.15);
  color: #38bdf8;
}

.islide-editor-table .input-editable {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #f59e0b;
}

.islide-editor-table .input-editable:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
  outline: none;
}

.editor-actions-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-start;
}
`;

if (!css.includes('.islide-kpi-summary-row')) {
  css += additionalCss;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('Appended additional CSS to indicator-slides.css');
} else {
  console.log('Additional CSS already present');
}
