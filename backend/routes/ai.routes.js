// ─── AI routes ───────────────────────────────────────────────────────────────
// Features powered by the Anthropic API (require ANTHROPIC_API_KEY in .env):
//   - food pairings for a wine
//   - label detection (photo → autofilled wine fields)
// Plus the simple field autocomplete which is plain SQL.

const express = require('express');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../lib/auth');
const { wineUpload } = require('../lib/upload');

const router = express.Router();

// Food pairing suggestions
router.get('/api/wines/:id/pairings', async (req, res) => {
  const wine = db.prepare('SELECT * FROM wines WHERE id = ?').get(req.params.id);
  if (!wine) return res.status(404).json({ error: 'not found' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ pairings: null, reason: 'Set ANTHROPIC_API_KEY in backend/.env to enable pairing suggestions' });
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();

    const parts = [
      wine.name && `Wine: ${wine.name}`,
      wine.winery && `Winery: ${wine.winery}`,
      wine.type && `Style: ${wine.type}`,
      wine.vintage && `Vintage: ${wine.vintage}`,
      wine.location && `Region: ${wine.location}`,
      wine.grapes && `Grapes: ${wine.grapes}`,
      wine.is_biodynamic && 'Biodynamic',
      wine.notes && `Tasting notes: ${wine.notes.slice(0, 200)}`,
    ].filter(Boolean).join('. ');

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `${parts}\n\nSuggest 4 specific foods that pair well with this wine. Return ONLY a JSON array of short strings (dish name only, no explanation), e.g. ["Roast lamb", "Aged manchego", "Mushroom risotto", "Dark chocolate"]. No markdown, no extra text.`,
      }],
    });

    const match = response.content[0].text.match(/\[[\s\S]*\]/);
    const pairings = match ? JSON.parse(match[0]) : [];
    res.json({ pairings });
  } catch (err) {
    console.error('Pairings error:', err.message);
    res.json({ pairings: null, reason: err.message });
  }
});

// Field autocomplete (winery / region / grapes) — column names are whitelisted
router.get('/api/suggestions', (req, res) => {
  const { field, q } = req.query;
  const allowed = { winery: 'winery', region: 'location', grapes: 'grapes' };
  const col = allowed[field];
  if (!col || !q || q.trim().length < 1) return res.json([]);
  const rows = db.prepare(
    `SELECT DISTINCT ${col} FROM wines WHERE ${col} LIKE ? AND ${col} != '' ORDER BY ${col} LIMIT 20`
  ).all(`%${q.trim()}%`);
  const seen = new Set();
  const results = [];
  for (const row of rows) {
    const raw = row[col] || '';
    const parts = field === 'grapes' ? raw.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [raw];
    for (const part of parts) {
      if (!seen.has(part.toLowerCase()) && part.toLowerCase().includes(q.trim().toLowerCase())) {
        seen.add(part.toLowerCase());
        results.push(part);
      }
    }
    if (!seen.has(raw.toLowerCase()) && raw.toLowerCase().includes(q.trim().toLowerCase())) {
      seen.add(raw.toLowerCase());
      results.push(raw);
    }
  }
  res.json(results.slice(0, 8));
});

// Translate a wine review (token required — each call costs API credits)
router.post('/api/translate', requireAuth, async (req, res) => {
  const { text, target } = req.body;
  if (!text?.trim() || !target) return res.status(400).json({ error: 'text and target required' });
  if (text.length > 2000) return res.status(400).json({ error: 'text too long' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ translation: null, reason: 'Set ANTHROPIC_API_KEY in backend/.env to enable translation' });
  }
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Translate this wine tasting review into ${target}. Keep wine terminology natural for that language. Return ONLY the translation, no preamble:\n\n${text.trim()}`,
      }],
    });
    res.json({ translation: response.content[0].text.trim() });
  } catch (err) {
    console.error('Translate error:', err.message);
    res.json({ translation: null, reason: err.message });
  }
});

// Wine label detection from a photo (token required — uploads cost storage)
router.post('/api/detect', requireAuth, wineUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no image' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ detected: false, reason: 'Set ANTHROPIC_API_KEY in backend/.env to enable auto-detection', imagePath: `/uploads/wines/${req.file.filename}` });
  }
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();
    const base64   = fs.readFileSync(req.file.path).toString('base64');
    const mimeType = req.file.mimetype;

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: 'Analyze this wine image. Return ONLY valid JSON (no markdown, no explanation) with these exact keys.\n\n{"winery":string|null,"name":string|null,"vintage":number|null,"location":string|null,"grapes":string|null,"type":"Red"|"White"|"Rosé"|"Sparkling"|"Champagne"|"Dessert"|"Fortified"|"Spirit"|null,"is_biodynamic":boolean,"is_organic":boolean,"shot_type":"full_bottle"|"label_only"|"partial","crop":{"x":number,"y":number,"w":number,"h":number}}\n\ntype: use "Champagne" ONLY for wines from the Champagne appellation in France; all other sparkling wines (Prosecco, Cava, Crémant, sekt, traditional method elsewhere) are "Sparkling". "Spirit" covers whisky, gin, rum, brandy, vodka etc.\n\nshot_type: "full_bottle" = entire bottle visible (capsule to base); "label_only" = only the label or a close-up of it; "partial" = bottle present but significantly cut off.\n\ncrop = bounding box as % of image (0-100) of the best region to show on a card: for full_bottle frame the whole bottle with ~5% padding; for label_only frame the label area; for partial frame the most visible part.\n\nUse null for unknown wine fields.' }
        ]
      }]
    });

    const match = response.content[0].text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    const { shot_type, crop, ...data } = parsed;
    res.json({ detected: true, data, shot_type: shot_type || null, crop: crop || null, imagePath: `/uploads/wines/${req.file.filename}` });
  } catch (err) {
    console.error('Detection error:', err.message);
    res.json({ detected: false, reason: err.message, imagePath: `/uploads/wines/${req.file.filename}` });
  }
});

// Barcode lookup — EAN/UPC → wine fields via Open Food Facts (free, no key)
router.get('/api/barcode/:code', requireAuth, async (req, res) => {
  const code = req.params.code.replace(/\D/g, '');
  if (!code) return res.status(400).json({ error: 'invalid barcode' });
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,categories_tags,quantity`,
      { headers: { 'User-Agent': 'Sipiary/1.0 (https://sipiary.fly.dev)' }, signal: AbortSignal.timeout(6000) }
    );
    const json = await r.json();
    if (json.status !== 1 || !json.product) {
      return res.json({ found: false, code });
    }
    const p = json.product;
    // Derive wine type from category tags
    const cats = (p.categories_tags || []).join(' ');
    let type = null;
    if (/champagne/i.test(cats))              type = 'Champagne';
    else if (/sparkling|prosecco|cava|cremant/i.test(cats)) type = 'Sparkling';
    else if (/ros[eé]/i.test(cats))           type = 'Rosé';
    else if (/white.wine|vin.blanc/i.test(cats)) type = 'White';
    else if (/red.wine|vin.rouge/i.test(cats))   type = 'Red';
    else if (/dessert|sweet.wine/i.test(cats))   type = 'Dessert';
    else if (/port|sherry|madeira|fortif/i.test(cats)) type = 'Fortified';
    else if (/whisky|whiskey|gin|rum|vodka|brandy|cognac|spirit/i.test(cats)) type = 'Spirit';

    res.json({
      found: true,
      code,
      data: {
        name:   p.product_name || null,
        winery: p.brands       || null,
        type,
      },
    });
  } catch (err) {
    console.error('Barcode lookup error:', err.message);
    res.json({ found: false, code, reason: err.message });
  }
});

module.exports = router;
