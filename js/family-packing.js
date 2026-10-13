document.addEventListener('familydb-ready', async () => {
  const d = window.familyDB;
  const items = document.getElementById('items');
  const categoryList = document.getElementById('categoryList');
  const modal = document.getElementById('categoryModal');
  const openModal = document.getElementById('openCategoryModal');
  const selectedCategory = document.getElementById('selectedCategory');
  let rows = [];
  let categories = [];

  function selectedCategoryId() {
    return selectedCategory.value === '' ? null : selectedCategory.value;
  }

  function categoryName(id) {
    const category = categories.find(c => String(c.id) === String(id));
    return category ? category.name : '未分類';
  }

  function renderCategorySelect(preferredValue) {
    const oldValue = preferredValue !== undefined ? String(preferredValue ?? '') : selectedCategory.value;
    selectedCategory.innerHTML = '<option value="">未分類</option>' + categories.map(c =>
      `<option value="${d.esc(c.id)}">${d.esc(c.name)}</option>`
    ).join('');
    const exists = [...selectedCategory.options].some(option => option.value === oldValue);
    if (exists) selectedCategory.value = oldValue;
    else if (categories.length) selectedCategory.value = String(categories[0].id);
    else selectedCategory.value = '';
  }

  async function loadCategories(preferredValue) {
    categories = await d.rows('family_packing_categories', 'sort_order', true);
    renderCategories();
    renderCategorySelect(preferredValue);
  }

  function renderCategories() {
    categoryList.innerHTML = categories.map(c => `
      <div class="family-list-row">
        <div><strong>${d.esc(c.name)}</strong></div>
        <button type="button" class="family-button danger" data-cat-delete="${d.esc(c.id)}">削除</button>
      </div>`).join('') || '<p class="family-muted">登録済みカテゴリはありません。</p>';

    categoryList.querySelectorAll('[data-cat-delete]').forEach(button => {
      button.onclick = async () => {
        const category = categories.find(c => String(c.id) === button.dataset.catDelete);
        if (!category || !confirm(`「${category.name}」カテゴリを削除しますか？このカテゴリに設定した持ち物は未分類になります。`)) return;
        try {
          const wasSelected = String(selectedCategory.value) === String(category.id);
          await d.remove('family_packing_categories', category.id);
          await loadCategories(wasSelected ? '' : selectedCategory.value);
          await loadItems();
          d.toast('カテゴリを削除しました');
        } catch (error) {
          console.error(error);
          d.toast('カテゴリを削除できませんでした');
        }
      };
    });
  }

  function renderItems() {
    const currentId = selectedCategoryId();
    const visibleRows = rows.filter(item => currentId === null
      ? item.category_id == null || item.category_id === ''
      : String(item.category_id) === String(currentId));
    const checked = visibleRows.filter(item => item.checked).length;
    document.getElementById('progress').textContent = `${checked} / ${visibleRows.length} 準備OK（${categoryName(currentId)}）`;
    document.getElementById('bar').style.width = `${visibleRows.length ? checked / visibleRows.length * 100 : 0}%`;
    items.innerHTML = visibleRows.map(item => `
      <div class="family-list-row packing-item-row">
        <div class="packing-item-main">
          <label><input type="checkbox" data-check="${d.esc(item.id)}" ${item.checked ? 'checked' : ''}> ${d.esc(item.name)}</label>
        </div>
        <button type="button" class="family-button danger" data-del="${d.esc(item.id)}">削除</button>
      </div>`).join('') || `<p class="family-muted">「${d.esc(categoryName(currentId))}」カテゴリの持ち物はありません。</p>`;

    items.querySelectorAll('[data-check]').forEach(input => {
      input.onchange = async () => {
        try {
          await d.update('family_packing_items', input.dataset.check, { checked: input.checked });
          await loadItems();
        } catch (error) {
          console.error(error);
          d.toast('更新できませんでした');
        }
      };
    });

    items.querySelectorAll('[data-del]').forEach(button => {
      button.onclick = async () => {
        try {
          await d.remove('family_packing_items', button.dataset.del);
          await loadItems();
        } catch (error) {
          console.error(error);
          d.toast('持ち物を削除できませんでした');
        }
      };
    });
  }

  async function loadItems() {
    rows = await d.rows('family_packing_items', 'sort_order', true);
    renderItems();
  }

  selectedCategory.addEventListener('change', renderItems);

  document.getElementById('addForm').addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.getElementById('newItem');
    const name = input.value.trim();
    if (!name) return;
    try {
      await d.insert('family_packing_items', {
        name,
        checked: false,
        sort_order: rows.length,
        category_id: selectedCategoryId()
      });
      input.value = '';
      await loadItems();
      d.toast(`「${categoryName(selectedCategoryId())}」に追加しました`);
    } catch (error) {
      console.error(error);
      d.toast('持ち物を追加できませんでした');
    }
  });

  document.getElementById('reset').onclick = async () => {
    try {
      const currentId = selectedCategoryId();
      const visibleRows = rows.filter(item => currentId === null
        ? item.category_id == null || item.category_id === ''
        : String(item.category_id) === String(currentId));
      for (const item of visibleRows) {
        if (item.checked) await d.update('family_packing_items', item.id, { checked: false });
      }
      await loadItems();
    } catch (error) {
      console.error(error);
      d.toast('リセットできませんでした');
    }
  };

  document.getElementById('categoryForm').addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.getElementById('newCategory');
    const name = input.value.trim();
    if (!name) return;
    if (categories.some(category => category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      d.toast('同じ名前のカテゴリがあります');
      return;
    }
    try {
      const result = await d.insert('family_packing_categories', { name, sort_order: categories.length });
      input.value = '';
      await loadCategories(result && result.id ? String(result.id) : undefined);
      // 新規カテゴリを選択状態にし、追加後の一覧もそのカテゴリに切り替える
      const created = categories.find(category => category.name.toLocaleLowerCase() === name.toLocaleLowerCase());
      if (created) selectedCategory.value = String(created.id);
      await loadItems();
      d.toast('荷物カテゴリを追加しました');
    } catch (error) {
      console.error(error);
      d.toast('カテゴリを追加できませんでした');
    }
  });

  function closeModal() { modal.hidden = true; }
  openModal.onclick = () => {
    modal.hidden = false;
    document.getElementById('newCategory').focus();
  };
  modal.querySelectorAll('[data-close-category-modal]').forEach(button => button.onclick = closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });

  try {
    await loadCategories();
    await loadItems();
  } catch (error) {
    console.error(error);
    d.toast('読み込みに失敗しました。カテゴリ用SQLが適用済みか確認してください。');
  }
});
