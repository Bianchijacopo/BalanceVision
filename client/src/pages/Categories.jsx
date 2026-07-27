import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import {
  getAllCategories, getCustomCategories, addCustomCategory,
  removeCustomCategory, isDefaultCategory, DEFAULT_CATEGORIES, catName
} from '../utils/categoryManager';
import {
  getCategoryColors, setCategoryColor, getUnusedColor, DEFAULT_COLORS
} from '../utils/categoryColors';

export default function Categories() {
  const { t, lang } = useLanguage();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const [newName, setNewName] = useState('');

  const colors = getCategoryColors();
  const allCats = getAllCategories();
  const customCats = getCustomCategories();

  function forceUpdate() {
    setRefresh(n => n + 1);
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (allCats.includes(name)) {
      addToast(t('categories.nameExists'), 'error');
      return;
    }
    addCustomCategory(name);
    const unused = getUnusedColor(colors);
    setCategoryColor(name, unused);
    setNewName('');
    addToast(t('categories.added').replace('{name}', name), 'success');
    forceUpdate();
  }

  function handleDelete(name) {
    const msg = t('categories.deleteConfirm').replace('{name}', name);
    if (!confirm(msg)) return;
    removeCustomCategory(name);
    addToast(t('categories.deleted'), 'success');
    forceUpdate();
  }

  function handleColorChange(cat, color) {
    setCategoryColor(cat, color);
    forceUpdate();
  }

  return (
    <div className="layout">
      <Topbar title={t('categories.title')} />
      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('categories.title')}</h2>
            <p className="card-subtitle">{t('categories.subtitle')}</p>
          </div>

          <div className="add-cat-row" style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">{t('categories.nameLabel')}</label>
              <input className="form-input" value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t('categories.namePlaceholder')}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <button className="btn btn-primary" onClick={handleAdd}
              disabled={!newName.trim()}
              style={{ minWidth: 90 }}>
              {t('categories.addBtn')}
            </button>
          </div>

          <h3 className="section-title" style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>
            {t('categories.defaultTitle')}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {DEFAULT_CATEGORIES.map(c => (
              <span key={c} className="tx-cat-tag" style={{
                background: colors[c] + '22',
                border: '1px solid ' + colors[c],
                color: 'var(--text-primary)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
                  background: colors[c], flexShrink: 0
                }} />
                {catName(c, t)}
              </span>
            ))}
          </div>

          <h3 className="section-title" style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>
            {t('categories.customTitle')}
          </h3>
          {customCats.length === 0 && (
            <p className="text-secondary text-center" style={{ padding: 16, fontSize: 13 }}>
              {t('categories.noCustom')}
            </p>
          )}
          {customCats.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {customCats.map(c => (
                <span key={c} className="tx-cat-tag" style={{
                  background: colors[c] + '22',
                  border: '1px solid ' + colors[c],
                  color: 'var(--text-primary)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
                    background: colors[c], flexShrink: 0
                  }} />
                  {c}
                  <input type="color" value={colors[c] || DEFAULT_COLORS[0]}
                    onChange={e => handleColorChange(c, e.target.value)}
                    style={{ width: 20, height: 20, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                  <button onClick={() => handleDelete(c)}
                    title={t('categories.deleteBtn')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--danger)', fontSize: 16, lineHeight: 1, padding: '0 2px'
                    }}>&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            {t('categories.backToDashboard')}
          </button>
        </div>
      </main>
    </div>
  );
}
