// Node.js Express server — حفظ الصور في /uploads وبيانات في db.json
// تثبيت الحزم: npm install express multer cors body-parser
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, '-');
    cb(null, `${ts}-${safe}`);
  }
});
const upload = multer({ storage });

// Helper to read/write DB (very simple JSON file)
function readDB() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { products: [], intro: '' };
  }
}
function writeDB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// API
app.get('/api/products', (req, res) => {
  const db = readDB();
  // convert image filename to public url if stored as filename
  const list = db.products.map(p => ({ ...p, image: p.image && p.image.startsWith('/uploads') ? p.image : p.image }));
  res.json(list);
});

app.post('/api/products', upload.single('image'), (req, res) => {
  const db = readDB();
  const { name, description, price, category } = req.body;
  const id = Date.now();
  let imageUrl = '';
  if (req.file) imageUrl = `/uploads/${req.file.filename}`;
  const item = { id, name, description, price, category, image: imageUrl };
  db.products.unshift(item);
  writeDB(db);
  res.status(201).json(item);
});

app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const db = readDB();
  const id = String(req.params.id);
  const idx = db.products.findIndex(p => String(p.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const p = db.products[idx];
  const { name, description, price, category } = req.body;
  if (name !== undefined) p.name = name;
  if (description !== undefined) p.description = description;
  if (price !== undefined) p.price = price;
  if (category !== undefined) p.category = category;
  if (req.file) {
    // remove old image file (optional)
    if (p.image && p.image.startsWith('/uploads')) {
      const oldPath = path.join(__dirname, p.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    p.image = `/uploads/${req.file.filename}`;
  }
  db.products[idx] = p;
  writeDB(db);
  res.json(p);
});

app.delete('/api/products/:id', (req, res) => {
  const db = readDB();
  const id = String(req.params.id);
  const idx = db.products.findIndex(p => String(p.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const p = db.products.splice(idx, 1)[0];
  // remove image file (optional)
  if (p.image && p.image.startsWith('/uploads')) {
    const imgPath = path.join(__dirname, p.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  writeDB(db);
  res.json({ ok: true });
});

app.get('/api/intro', (req, res) => {
  const db = readDB();
  res.json({ intro: db.intro || '' });
});

app.put('/api/intro', (req, res) => {
  const db = readDB();
  db.intro = req.body.intro || '';
  writeDB(db);
  res.json({ intro: db.intro });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));