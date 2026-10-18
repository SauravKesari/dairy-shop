import React, { useMemo, useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import { DEFAULT_UNITS } from '../../lib/units';
import { useLanguage } from '../../i18n/LanguageContext';
import { Tags, Ruler, Plus, Edit3, EyeOff, Eye, Trash2, Check, X } from 'lucide-react';

// Owner screen to add, rename and hide categories, and add, rename and remove custom units
export const CategoriesUnitsScreen: React.FC = () => {
  const {
    categories,
    products,
    settings,
    currentUser,
    addCategory,
    updateCategory,
    addCustomUnit,
    renameCustomUnit,
    removeCustomUnit,
  } = useDairy();
  const { t, tx } = useLanguage();

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Inline edit state: which row is being renamed and its draft text
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('');

  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(p => map.set(p.category_id, (map.get(p.category_id) || 0) + 1));
    return map;
  }, [products]);

  const productCountByUnit = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(p => map.set(p.unit, (map.get(p.unit) || 0) + 1));
    return map;
  }, [products]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)),
    [categories]
  );

  if (currentUser.role !== 'owner') {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="font-semibold text-sm">{t('categories.restricted')}</p>
        <p className="text-xs mt-1">{t('categories.ownerOnly')}</p>
      </div>
    );
  }

  // Runs a context action with shared busy / error / success handling
  const run = async (action: () => Promise<{ success: boolean; error?: string }>, successMsg: string) => {
    if (busy) return false;
    setError(null);
    setNotice(null);
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (!res.success) {
      setError(res.error || t('err.generic'));
      return false;
    }
    setNotice(successMsg);
    return true;
  };

  const startEdit = (kind: 'category' | 'unit', key: string, current: string) => {
    setError(null);
    setNotice(null);
    setEditingCategoryId(kind === 'category' ? key : null);
    setEditingUnit(kind === 'unit' ? key : null);
    setDraft(current);
  };

  const cancelEdit = () => {
    setEditingCategoryId(null);
    setEditingUnit(null);
    setDraft('');
  };

  const saveCategoryName = async (id: string) => {
    if (await run(() => updateCategory(id, { name: draft }), t('categories.renamed', { name: draft.trim() }))) cancelEdit();
  };

  const saveUnitName = async (oldUnit: string) => {
    let updated = 0;
    const ok = await run(async () => {
      const res = await renameCustomUnit(oldUnit, draft);
      updated = res.productsUpdated || 0;
      return res;
    }, '');
    if (ok) {
      setNotice(
        updated
          ? t('categories.unitRenamedOn', { old: oldUnit, name: draft.trim(), count: updated })
          : t('categories.unitRenamed', { old: oldUnit, name: draft.trim() })
      );
      cancelEdit();
    }
  };

  const enterToSave = (save: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') cancelEdit();
  };

  const editInput = (save: () => void, maxLength?: number) => (
    <div className="flex items-center gap-1">
      <input
        type="text"
        autoFocus
        maxLength={maxLength}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={enterToSave(save)}
        className="w-full min-w-0 px-2 py-1 border border-slate-300 rounded-md text-xs"
      />
      <button type="button" disabled={busy} onClick={save} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title={t('common.save')}>
        <Check className="w-4 h-4" />
      </button>
      <button type="button" onClick={cancelEdit} className="p-1 text-slate-500 hover:bg-slate-100 rounded" title={t('common.cancel')}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const customUnits = settings.custom_units || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{t('categories.title')}</h2>
        <p className="text-xs text-slate-500 mt-1">
          {t('categories.subtitle')}
        </p>
      </div>

      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
      {notice && <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">{notice}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <Tags className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">{t('categories.categories')}</h3>
          </div>

          <form
            className="p-3 border-b border-slate-100 flex gap-2"
            onSubmit={async e => {
              e.preventDefault();
              if (await run(() => addCategory(newCategory), t('categories.added', { name: newCategory.trim() }))) setNewCategory('');
            }}
          >
            <input
              type="text"
              placeholder={t('categories.newCategoryPh')}
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="flex-1 min-w-0 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
            <button
              type="submit"
              disabled={busy || !newCategory.trim()}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('common.add')}</span>
            </button>
          </form>

          <ul className="divide-y divide-slate-100 text-xs">
            {sortedCategories.map(c => (
              <li key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {editingCategoryId === c.id ? (
                    editInput(() => saveCategoryName(c.id))
                  ) : (
                    <>
                      <span className={`font-semibold ${c.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                        {c.name}
                      </span>
                      <span className="ml-2 text-slate-500">{t('categories.productCount', { count: productCountByCategory.get(c.id) || 0 })}</span>
                      {!c.active && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t('categories.hidden')}</span>}
                    </>
                  )}
                </div>
                {editingCategoryId !== c.id && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit('category', c.id, c.name)}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                      title={t('categories.rename')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => updateCategory(c.id, { active: !c.active }),
                          c.active ? t('categories.hiddenMsg', { name: c.name }) : t('categories.visibleMsg', { name: c.name })
                        )
                      }
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                      title={c.active ? t('categories.hideTitle') : t('categories.showAgain')}
                    >
                      {c.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </li>
            ))}
            {categories.length === 0 && <li className="px-4 py-3 text-slate-500">{t('categories.noCategories')}</li>}
          </ul>
        </section>

        {/* Units */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">{t('categories.units')}</h3>
          </div>

          <form
            className="p-3 border-b border-slate-100 flex gap-2"
            onSubmit={async e => {
              e.preventDefault();
              if (await run(() => addCustomUnit(newUnit), t('categories.unitAdded', { name: newUnit.trim() }))) setNewUnit('');
            }}
          >
            <input
              type="text"
              maxLength={12}
              placeholder={t('categories.newUnitPh')}
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              className="flex-1 min-w-0 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
            <button
              type="submit"
              disabled={busy || !newUnit.trim()}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('common.add')}</span>
            </button>
          </form>

          <ul className="divide-y divide-slate-100 text-xs">
            {customUnits.map(u => (
              <li key={u} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {editingUnit === u ? (
                    editInput(() => saveUnitName(u), 12)
                  ) : (
                    <>
                      <span className="font-semibold text-slate-900 font-mono-numbers">{u}</span>
                      <span className="ml-2 text-slate-500">{t('categories.productCount', { count: productCountByUnit.get(u) || 0 })}</span>
                    </>
                  )}
                </div>
                {editingUnit !== u && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit('unit', u, u)}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                      title={t('categories.renameUnitTitle')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => removeCustomUnit(u), t('categories.unitRemoved', { name: u }))}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title={t('categories.removeUnitTitle')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
            {customUnits.length === 0 && (
              <li className="px-4 py-3 text-slate-500">{t('categories.noUnits')}</li>
            )}
          </ul>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">{t('categories.builtIn')}</span>
            {DEFAULT_UNITS.map(
              u => `${u.unit} – ${tx(`unitLabel.${u.unit}`, u.label)} (${productCountByUnit.get(u.unit) || 0})`
            ).join(' · ')}
          </div>
        </section>
      </div>

      <p className="text-[11px] text-slate-500">
        {t('categories.footnote')}
      </p>
    </div>
  );
};
