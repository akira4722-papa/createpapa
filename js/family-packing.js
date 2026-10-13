document.addEventListener('familydb-ready', async () => {
  const d = window.familyDB;
  const items = document.getElementById('items');
  const categoryList = document.getElementById('categoryList');
  const modal = document.getElementById('categoryModal');
  const openModal = document.getElementById('openCategoryModal');
  let rows = [];
  let categories = [];

  async function loadCategories() {
    categories = await d.rows('family_packing_categories', 'sort_order', true);
    renderCategories();
  }

  function renderCategories() {
    categoryList.innerHTML = categories.map(c => `
      <div class="family-list-row">
        <div><strong>${d.esc(c.name)}</strong></div>
        <button type="button" class="family-button danger" data-cat-delete="${c.id}">削除</button>
      </div>`).join('') || '<p class="family-muted">登録済みカテゴリはありません。</p>';

    categoryList.querySelectorAll('[data-cat-delete]').forEach(button => {
      button.onclick = async () => {
        const category = categories.find(c => c.id === button.dataset.catDelete);
        if (!category || !confirm(`「${category.name}」カテゴリを削除しますか？`)) return;
        try {
          await d.remove('family_packing_categories', category.id);
          await loadCategories();
          d.toast('カテゴリを削除しました');
        } catch (error) {
          console.error(error);
          d.toast('カテゴリを削除できませんでした');
        }
      };
    });
  }

  function renderItems() {
    const checked = rows.filter(item => item.checked).length;
    document.getElementById('progress').textContent = `${checked} / ${rows.length} 準備OK`;
    document.getElementById('bar').style.width = `${rows.length ? checked / rows.length * 100 : 0}%`;
    items.innerHTML = rows.map(item => `
      <div class="family-list-row">
        <div><label><input type="checkbox" data-check="${item.id}" ${item.checked ? 'checked' : ''}> ${d.esc(item.name)}</label></div>
        <button type="button" class="family-button danger" data-del="${item.id}">削除</button>
      </div>`).join('') || '<p class="family-muted">持ち物がありません。</p>';

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

  document.getElementById('addForm').addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.getElementById('newItem');
    const name = input.value.trim();
    if (!name) return;
    try {
      await d.insert('family_packing_items', { name, checked: false, sort_order: rows.length });
      input.value = '';
      await loadItems();
    } catch (error) {
      console.error(error);
      d.toast('持ち物を追加できませんでした');
    }
  });

  document.getElementById('reset').onclick = async () => {
    try {
      for (const item of rows) {
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
      await d.insert('family_packing_categories', { name, sort_order: categories.length });
      await loadCategories();
      input.value = '';
      d.toast('荷物カテゴリを追加しました');
    } catch (error) {
      console.error(error);
      d.toast('カテゴリを追加できませんでした');
    }
  });

  function closeModal() {
    modal.hidden = true;
  }
  openModal.onclick = () => {
    modal.hidden = false;
    document.getElementById('newCategory').focus();
  };
  modal.querySelectorAll('[data-close-category-modal]').forEach(button => button.onclick = closeModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  try {
    await loadCategories();
    await loadItems();
  } catch (error) {
    console.error(error);
    d.toast('読み込みに失敗しました。カテゴリ用SQLが適用済みか確認してください。');
  }
});
