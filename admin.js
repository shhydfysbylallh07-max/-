// لوحة تحكم بسيطة - تتواصل مع API على نفس الأصل (مثال: http://localhost:3000)
// إذا لم تستخدم السيرفر، يمكنك تعديل toLocal=true لاختبار localStorage
const toLocal = false; // اجعل true لاختبار بدون سيرفر

const apiBase = ''; // فارغ => نفس الأصل. لو تشغيل سيرفر: 'http://localhost:3000'
const productForm = document.getElementById('productForm');
const productsList = document.getElementById('productsList');
const productImageInput = document.getElementById('productImage');
const imagePreview = document.getElementById('imagePreview');
const refreshBtn = document.getElementById('refreshBtn');
const saveIntroBtn = document.getElementById('saveIntro');
const appIntro = document.getElementById('appIntro');

let editingId = null;

async function fetchProducts() {
  if (toLocal) {
    const items = JSON.parse(localStorage.getItem('products') || '[]');
    return items;
  }
  const res = await fetch(apiBase + '/api/products');
  return res.json();
}

function renderProducts(list) {
  productsList.innerHTML = '';
  if (!list.length) {
    productsList.innerHTML = '<p>لا توجد منتجات بعد.</p>';
    return;
  }
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.image || ''}" alt="${escapeHtml(p.name)}" />
      <div>
        <h3 style="margin:0">${escapeHtml(p.name)}</h3>
        <p style="margin:0.25rem 0;color:#6b7280">${escapeHtml(p.category||'')}</p>
      </div>
      <div class="product-meta">
        <strong style="color:var(--primary)">${p.price ? p.price + ' ر.س' : ''}</strong>
        <div>
          <button data-id="${p.id}" class="editBtn btn">تعديل</button>
          <button data-id="${p.id}" class="delBtn btn btn-outline">حذف</button>
        </div>
      </div>
    `;
    productsList.appendChild(card);
  });
  attachProductActions();
}

function attachProductActions() {
  document.querySelectorAll('.editBtn').forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.id;
      const list = await fetchProducts();
      const p = list.find(x => String(x.id) === String(id));
      if (!p) return alert('المنتج غير موجود');
      editingId = p.id;
      document.getElementById('productId').value = p.id;
      document.getElementById('productName').value = p.name;
      document.getElementById('productDesc').value = p.description || '';
      document.getElementById('productPrice').value = p.price || '';
      document.getElementById('productCategory').value = p.category || '';
      imagePreview.innerHTML = p.image ? `<img src="${p.image}" alt="preview">` : '';
    };
  });
  document.querySelectorAll('.delBtn').forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.id;
      if (!confirm('هل تريد حذف هذا المنتج؟')) return;
      if (toLocal) {
        let items = JSON.parse(localStorage.getItem('products') || '[]');
        items = items.filter(x => String(x.id) !== String(id));
        localStorage.setItem('products', JSON.stringify(items));
        loadAndRender();
        return;
      }
      const res = await fetch(apiBase + '/api/products/' + id, { method: 'DELETE' });
      if (res.ok) loadAndRender();
      else alert('حدث خطأ عند الحذف');
    };
  });
}

productImageInput.onchange = () => {
  const f = productImageInput.files && productImageInput.files[0];
  if (!f) { imagePreview.innerHTML = ''; return; }
  const reader = new FileReader();
  reader.onload = e => imagePreview.innerHTML = `<img src="${e.target.result}" alt="preview">`;
  reader.readAsDataURL(f);
};

productForm.onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById('productId').value || null;
  const name = document.getElementById('productName').value.trim();
  const description = document.getElementById('productDesc').value.trim();
  const price = document.getElementById('productPrice').value;
  const category = document.getElementById('productCategory').value.trim();
  const file = productImageInput.files && productImageInput.files[0];

  if (toLocal) {
    let items = JSON.parse(localStorage.getItem('products') || '[]');
    if (!id) {
      const newItem = {
        id: Date.now(),
        name, description, price, category,
        image: ''
      };
      if (file) {
        const b = await fileToDataURL(file);
        newItem.image = b;
      }
      items.unshift(newItem);
      localStorage.setItem('products', JSON.stringify(items));
    } else {
      items = items.map(x => {
        if (String(x.id) !== String(id)) return x;
        return { ...x, name, description, price, category, image: x.image };
      });
      if (file) {
        const b = await fileToDataURL(file);
        items = items.map(x => x.id == id ? ({ ...x, image: b }) : x);
      }
      localStorage.setItem('products', JSON.stringify(items));
    }
    resetForm();
    loadAndRender();
    return;
  }

  const formData = new FormData();
  if (file) formData.append('image', file);
  formData.append('name', name);
  formData.append('description', description);
  formData.append('price', price);
  formData.append('category', category);

  const url = id ? apiBase + '/api/products/' + id : apiBase + '/api/products';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, body: formData });
  if (res.ok) {
    alert('تم الحفظ');
    resetForm();
    loadAndRender();
  } else {
    alert('حدث خطأ أثناء الحفظ');
  }
};

async function loadAndRender() {
  const list = await fetchProducts();
  renderProducts(list || []);
  loadIntro();
}

function resetForm() {
  editingId = null;
  productForm.reset();
  document.getElementById('productId').value = '';
  imagePreview.innerHTML = '';
}

refreshBtn.onclick = loadAndRender;
document.getElementById('resetForm').onclick = resetForm;

async function loadIntro() {
  if (toLocal) {
    appIntro.value = localStorage.getItem('appIntro') || '';
    return;
  }
  try {
    const res = await fetch(apiBase + '/api/intro');
    if (res.ok) {
      const data = await res.json();
      appIntro.value = data.intro || '';
    }
  } catch (e) {}
}

saveIntroBtn.onclick = async () => {
  const text = appIntro.value;
  if (toLocal) {
    localStorage.setItem('appIntro', text);
    alert('تم الحفظ محلياً');
    return;
  }
  const res = await fetch(apiBase + '/api/intro', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intro: text })
  });
  if (res.ok) alert('تم تحديث المقدمة');
  else alert('خطأ عند حفظ المقدمة');
};

function fileToDataURL(file) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.readAsDataURL(file);
  });
}

function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// initial load
loadAndRender();