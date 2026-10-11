/**
 * Enterprise Form Engine — Schema-Driven UI Runtime
 * Renders JSON Schema v7 into ergonomic RTL Health-Tech forms with conditional logic.
 */
(function(window) {
  'use strict';

  class EnterpriseFormEngine {
    constructor(config) {
      this.container = typeof config.container === 'string' 
        ? document.getElementById(config.container) 
        : config.container;
      this.schema = config.schema || { properties: {} };
      this.uiSchema = config.uiSchema || {};
      this.fieldRules = config.fieldRules || {};
      this.formData = Object.assign({}, config.initialData || {});
      this.onSubmit = config.onSubmit || (() => {});
      this.elements = {};
    }

    render() {
      if (!this.container) return;
      this.container.innerHTML = '';

      const formEl = document.createElement('form');
      formEl.className = 'enterprise-form-root';
      formEl.setAttribute('dir', 'rtl');

      if (this.schema.title) {
        const header = document.createElement('div');
        header.className = 'ef-header';
        header.innerHTML = `<h3 class="ef-title">${this.esc(this.schema.title)}</h3>`;
        formEl.appendChild(header);
      }

      const grid = document.createElement('div');
      grid.className = 'ef-grid';

      const properties = this.schema.properties || {};
      const requiredFields = new Set(this.schema.required || []);

      for (const [fieldName, fieldDef] of Object.entries(properties)) {
        const fieldWrapper = this.createFieldElement(fieldName, fieldDef, requiredFields.has(fieldName));
        this.elements[fieldName] = fieldWrapper;
        grid.appendChild(fieldWrapper);
      }

      formEl.appendChild(grid);

      // دکمه‌های اقدام
      const actionRow = document.createElement('div');
      actionRow.className = 'ef-actions btn-row noprint';
      actionRow.innerHTML = `
        <button type="submit" class="btn btn--primary btn--md ef-submit-btn">
          <span>ثبت و ذخیره فرم</span>
        </button>
        <button type="button" class="btn btn--secondary btn--md ef-print-btn" onclick="window.print()">
          <span>🖨️ چاپ فرم</span>
        </button>
      `;

      formEl.appendChild(actionRow);

      formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });

      this.container.appendChild(formEl);
      this.evaluateConditionalLogic();
    }

    createFieldElement(name, def, isRequired) {
      const wrap = document.createElement('div');
      wrap.className = 'ef-field-group';
      wrap.id = `ef-group-${name}`;

      const isReadOnly = this.fieldRules[name] === 'read_only';
      const labelText = def.title || name;
      
      const label = document.createElement('label');
      label.className = 'ef-label';
      label.innerHTML = `${this.esc(labelText)} ${isRequired ? '<span class="req">*</span>' : ''} ${isReadOnly ? '<span class="lock-tag" title="فقط خواندنی">🔒</span>' : ''}`;
      wrap.appendChild(label);

      let inputEl;

      if (def.enum) {
        inputEl = document.createElement('select');
        inputEl.className = 'ef-select';
        inputEl.innerHTML = `<option value="">-- انتخاب کنید --</option>` +
          def.enum.map(opt => `<option value="${this.esc(opt)}" ${this.formData[name] === opt ? 'selected' : ''}>${this.esc(opt)}</option>`).join('');
      } else if (def.type === 'boolean') {
        inputEl = document.createElement('input');
        inputEl.type = 'checkbox';
        inputEl.className = 'ef-checkbox';
        inputEl.checked = !!this.formData[name];
      } else if (def.maxLength && def.maxLength > 200 || this.uiSchema[name]?.['ui:widget'] === 'textarea') {
        inputEl = document.createElement('textarea');
        inputEl.className = 'ef-textarea';
        inputEl.rows = 3;
        inputEl.value = this.formData[name] || '';
      } else {
        inputEl = document.createElement('input');
        inputEl.type = def.type === 'number' ? 'number' : 'text';
        inputEl.className = 'ef-input';
        inputEl.value = this.formData[name] || '';
      }

      inputEl.name = name;
      inputEl.id = `ef-input-${name}`;
      if (isReadOnly) {
        inputEl.setAttribute('disabled', 'true');
        inputEl.classList.add('ef-readonly');
      }

      inputEl.addEventListener('input', () => {
        this.formData[name] = inputEl.type === 'checkbox' ? inputEl.checked : inputEl.value;
        this.evaluateConditionalLogic();
      });

      inputEl.addEventListener('change', () => {
        this.formData[name] = inputEl.type === 'checkbox' ? inputEl.checked : inputEl.value;
        this.evaluateConditionalLogic();
      });

      wrap.appendChild(inputEl);
      return wrap;
    }

    evaluateConditionalLogic() {
      const properties = this.schema.properties || {};
      for (const [name, def] of Object.entries(properties)) {
        if (def.show_if) {
          const { field, equals } = def.show_if;
          const currentVal = this.formData[field];
          const shouldShow = currentVal === equals;
          const groupEl = this.elements[name];
          if (groupEl) {
            groupEl.style.display = shouldShow ? 'block' : 'none';
          }
        }
      }
    }

    handleSubmit() {
      // بررسی فیلدهای الزامی
      const required = this.schema.required || [];
      for (const reqField of required) {
        const val = this.formData[reqField];
        if (val === undefined || val === null || val === '') {
          alert(`لطفاً فیلد الزامی «${this.schema.properties[reqField]?.title || reqField}» را تکمیل فرمایید.`);
          return;
        }
      }
      this.onSubmit(this.formData);
    }

    esc(str) {
      return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }
  }

  window.EnterpriseFormEngine = EnterpriseFormEngine;
})(window);
