import express from 'express';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const { Pool } = pg;

// Simple in-memory fallback store if DATABASE_URL is missing
let memCustomers: any[] = [];
let memInvoices: any[] = [];
let memServices: any[] = [];
let memProfile: any = {
  company_name: 'Sparksfly O&G Pte Ltd',
  address: '123 Industrial Park Rd, #04-56\nSingapore 678901',
  phone: '+65 6123 4567',
  email: 'contact@sparksfly.sg',
  bank_name: 'OCBC Bank Singapore',
  bank_account_name: 'Sparksfly O&G Pte Ltd',
  bank_account_no: '123-456789-001',
  gst_percentage: 9.0
};
let memIdCounter = 1;

let pool: pg.Pool | null = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
  
  // Try to create tables
  const initDb = async () => {
    if (!pool) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          contact_person VARCHAR(255)
        );
        CREATE TABLE IF NOT EXISTS invoices (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          date DATE NOT NULL,
          total_amount NUMERIC(10, 2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          due_date DATE,
          notes TEXT,
          gst_enabled BOOLEAN DEFAULT false,
          gst_amount NUMERIC(10, 2) DEFAULT 0,
          subtotal NUMERIC(10, 2) DEFAULT 0
        );
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_enabled BOOLEAN DEFAULT false;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) DEFAULT 0;
        CREATE TABLE IF NOT EXISTS services (
          id SERIAL PRIMARY KEY,
          invoice_id INTEGER REFERENCES invoices(id),
          description TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price NUMERIC(10, 2) NOT NULL,
          total NUMERIC(10, 2) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS profile (
          id SERIAL PRIMARY KEY,
          company_name VARCHAR(255),
          address TEXT,
          phone VARCHAR(255),
          email VARCHAR(255),
          bank_name VARCHAR(255),
          bank_account_name VARCHAR(255),
          bank_account_no VARCHAR(255),
          gst_percentage NUMERIC(5, 2) DEFAULT 9.0
        );
        ALTER TABLE profile ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5, 2) DEFAULT 9.0;
        INSERT INTO profile (id, company_name, address, phone, email, bank_name, bank_account_name, bank_account_no) 
        SELECT 1, 'Sparksfly O&G Pte Ltd', '123 Industrial Park Rd, #04-56\nSingapore 678901', '+65 6123 4567', 'contact@sparksfly.sg', 'OCBC Bank Singapore', 'Sparksfly O&G Pte Ltd', '123-456789-001'
        WHERE NOT EXISTS (SELECT 1 FROM profile WHERE id = 1);
      `);
      console.log('Database initialized successfully');
    } catch (err) {
      console.error('Failed to initialize database:', err);
    }
  };
  initDb();
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  
  // Get Profile
  app.get('/api/profile', async (req, res) => {
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM profile WHERE id = 1');
        res.json(result.rows[0] || memProfile);
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: 'Database error', detail: err.message });
      }
    } else {
      res.json(memProfile);
    }
  });

  // Update Profile
  app.put('/api/profile', async (req, res) => {
    const { company_name, address, phone, email, bank_name, bank_account_name, bank_account_no, gst_percentage } = req.body;
    if (pool) {
      try {
        const result = await pool.query(
          `UPDATE profile SET company_name=$1, address=$2, phone=$3, email=$4, bank_name=$5, bank_account_name=$6, bank_account_no=$7, gst_percentage=$8 WHERE id=1 RETURNING *`,
          [company_name, address, phone, email, bank_name, bank_account_name, bank_account_no, gst_percentage]
        );
        res.json(result.rows[0]);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    } else {
      memProfile = { ...memProfile, company_name, address, phone, email, bank_name, bank_account_name, bank_account_no, gst_percentage };
      res.json(memProfile);
    }
  });

  // AI Generate Description
  app.post('/api/generate-description', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI assistant for a cleaning service company "Sparksfly O&G Pte Ltd". Generate a professional service description based on the prompt. Keep it concise, 1 sentence, no quotes, suitable for an invoice line item. Prompt: ${prompt}`,
      });
      res.json({ description: response.text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Failed to generate description' });
    }
  });

  app.get('/api/customers', async (req, res) => {
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM customers ORDER BY name');
        res.json(result.rows);
      } catch (err: any) {
        res.status(500).json({ error: 'Database error', detail: err.message });
      }
    } else {
      res.json(memCustomers);
    }
  });

  app.post('/api/customers', async (req, res) => {
    const { name, address, contact_person } = req.body;
    if (pool) {
      try {
        const result = await pool.query(
          'INSERT INTO customers (name, address, contact_person) VALUES ($1, $2, $3) RETURNING *',
          [name, address, contact_person]
        );
        res.json(result.rows[0]);
      } catch (err: any) {
        res.status(500).json({ error: 'Database error', detail: err.message });
      }
    } else {
      const newCust = { id: memIdCounter++, name, address, contact_person };
      memCustomers.push(newCust);
      res.json(newCust);
    }
  });

  app.put('/api/customers/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { name, address, contact_person } = req.body;
    if (pool) {
      try {
        const result = await pool.query(
          'UPDATE customers SET name=$1, address=$2, contact_person=$3 WHERE id=$4 RETURNING *',
          [name, address, contact_person, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
      } catch (err: any) {
        res.status(500).json({ error: 'Database error', detail: err.message });
      }
    } else {
      const idx = memCustomers.findIndex(c => c.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      memCustomers[idx] = { ...memCustomers[idx], name, address, contact_person };
      res.json(memCustomers[idx]);
    }
  });

  app.get('/api/customers/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
      } catch (err: any) {
        res.status(500).json({ error: 'Database error', detail: err.message });
      }
    } else {
      const cust = memCustomers.find(c => c.id === id);
      if (!cust) return res.status(404).json({ error: 'Not found' });
      res.json(cust);
    }
  });

  app.get('/api/customers/:id/invoices', async (req, res) => {
    const customerId = parseInt(req.params.id);
    if (pool) {
      try {
        const result = await pool.query(`
          SELECT i.*, c.name as customer_name 
          FROM invoices i 
          JOIN customers c ON i.customer_id = c.id 
          WHERE i.customer_id = $1
          ORDER BY i.id DESC
        `, [customerId]);
        res.json(result.rows);
      } catch (err: any) {
        res.status(500).json({ error: 'Database error', detail: err.message });
      }
    } else {
      const enriched = memInvoices
        .filter(i => i.customer_id === customerId)
        .map(i => ({
          ...i,
          customer_name: memCustomers.find(c => c.id === i.customer_id)?.name || 'Unknown'
        })).reverse();
      res.json(enriched);
    }
  });

  // Delete customer
  app.delete('/api/customers/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (pool) {
      try {
        const invs = await pool.query('SELECT id FROM invoices WHERE customer_id = $1', [id]);
        for (const inv of invs.rows) {
          await pool.query('DELETE FROM services WHERE invoice_id = $1', [inv.id]);
          await pool.query('DELETE FROM invoices WHERE id = $1', [inv.id]);
        }
        await pool.query('DELETE FROM customers WHERE id = $1', [id]);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    } else {
      const invsToDel = memInvoices.filter(i => i.customer_id === id).map(i => i.id);
      memServices = memServices.filter(s => !invsToDel.includes(s.invoice_id));
      memInvoices = memInvoices.filter(i => i.customer_id !== id);
      memCustomers = memCustomers.filter(c => c.id !== id);
      res.json({ success: true });
    }
  });

  // Get all invoices
  app.get('/api/invoices', async (req, res) => {
    if (pool) {
      try {
        const result = await pool.query(`
          SELECT i.*, c.name as customer_name 
          FROM invoices i 
          JOIN customers c ON i.customer_id = c.id 
          ORDER BY i.id DESC
        `);
        res.json(result.rows);
      } catch (err: any) {
        res.status(500).json({ error: 'Database error', detail: err.message });
      }
    } else {
      const enriched = memInvoices.map(i => ({
        ...i,
        customer_name: memCustomers.find(c => c.id === i.customer_id)?.name || 'Unknown'
      })).reverse();
      res.json(enriched);
    }
  });

  // Get invoice by ID
  app.get('/api/invoices/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (pool) {
      try {
        const invRes = await pool.query(`
          SELECT i.*, c.name, c.address, c.contact_person 
          FROM invoices i 
          JOIN customers c ON i.customer_id = c.id 
          WHERE i.id = $1
        `, [id]);
        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        
        const servRes = await pool.query('SELECT * FROM services WHERE invoice_id = $1 ORDER BY id', [id]);
        res.json({
          ...invRes.rows[0],
          services: servRes.rows
        });
      } catch (err: any) {
        res.status(500).json({ error: 'Database error', detail: err.message });
      }
    } else {
      const inv = memInvoices.find(i => i.id === id);
      if (!inv) return res.status(404).json({ error: 'Not found' });
      const cust = memCustomers.find(c => c.id === inv.customer_id) || {};
      const servs = memServices.filter(s => s.invoice_id === id);
      res.json({
        ...inv,
        name: cust.name,
        address: cust.address,
        contact_person: cust.contact_person,
        services: servs
      });
    }
  });

  // Delete invoice
  app.delete('/api/invoices/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (pool) {
      try {
        await pool.query('DELETE FROM services WHERE invoice_id = $1', [id]);
        await pool.query('DELETE FROM invoices WHERE id = $1', [id]);
        res.json({ success: true });
      } catch(e: any) {
        res.status(500).json({ error: e.message });
      }
    } else {
      memServices = memServices.filter(s => s.invoice_id !== id);
      memInvoices = memInvoices.filter(i => i.id !== id);
      res.json({ success: true });
    }
  });

  // Update invoice
  app.put('/api/invoices/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { customer_id, invoice_number, date, due_date, notes, gst_enabled, gst_amount, subtotal, total_amount, services } = req.body;
    
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'UPDATE invoices SET customer_id=$1, invoice_number=$2, date=$3, due_date=$4, notes=$5, gst_enabled=$6, gst_amount=$7, subtotal=$8, total_amount=$9 WHERE id=$10',
          [customer_id, invoice_number, date, due_date, notes, gst_enabled ? true : false, gst_amount, subtotal, total_amount, id]
        );
        
        await client.query('DELETE FROM services WHERE invoice_id = $1', [id]);
        
        for (const s of services) {
          await client.query(
            'INSERT INTO services (invoice_id, description, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5)',
            [id, s.description, s.quantity, s.unit_price, s.total]
          );
        }
        await client.query('COMMIT');
        res.json({ success: true, id });
      } catch (e: any) {
        await client.query('ROLLBACK');
        if (e.code === '23505') {
          res.status(409).json({ error: 'Invoice number already exists' });
        } else {
          res.status(500).json({ error: e.message });
        }
      } finally {
        client.release();
      }
    } else {
      const exists = memInvoices.some(inv => inv.invoice_number === invoice_number && inv.id !== id);
      if (exists) {
        return res.status(409).json({ error: 'Invoice number already exists' });
      }
      const idx = memInvoices.findIndex(i => i.id === id);
      if (idx !== -1) {
        memInvoices[idx] = { ...memInvoices[idx], customer_id, invoice_number, date, due_date, notes, gst_enabled, gst_amount, subtotal, total_amount };
        memServices = memServices.filter(s => s.invoice_id !== id);
        for (const s of services) {
          memServices.push({ id: Date.now() + Math.random(), invoice_id: id, ...s });
        }
      }
      res.json({ success: true, id });
    }
  });

  // Update invoice status
  app.patch('/api/invoices/:id/status', async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (pool) {
      try {
        await pool.query('UPDATE invoices SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    } else {
      const idx = memInvoices.findIndex(i => i.id === id);
      if (idx !== -1) {
        memInvoices[idx].status = status;
      }
      res.json({ success: true });
    }
  });

  // Create invoice
  app.post('/api/invoices', async (req, res) => {
    const { customer_id, invoice_number, date, due_date, notes, gst_enabled, gst_amount, subtotal, total_amount, services, status = 'pending' } = req.body;
    
    // basic validation
    if (!customer_id || !invoice_number || !date || typeof total_amount !== 'number' || !services || services.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const invRes = await client.query(
          'INSERT INTO invoices (customer_id, invoice_number, date, due_date, notes, gst_enabled, gst_amount, subtotal, total_amount, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
          [customer_id, invoice_number, date, due_date, notes, gst_enabled ? true : false, gst_amount, subtotal, total_amount, status]
        );
        const invoiceId = invRes.rows[0].id;
        
        for (const s of services) {
          await client.query(
            'INSERT INTO services (invoice_id, description, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5)',
            [invoiceId, s.description, s.quantity, s.unit_price, s.total]
          );
        }
        await client.query('COMMIT');
        res.json({ id: invoiceId });
      } catch (e: any) {
        await client.query('ROLLBACK');
        if (e.code === '23505') {
          res.status(409).json({ error: 'Invoice number already exists' });
        } else {
          res.status(500).json({ error: e.message });
        }
      } finally {
        client.release();
      }
    } else {
      // Check local duplicate for in-memory store
      const exists = memInvoices.some(inv => inv.invoice_number === invoice_number);
      if (exists) {
        return res.status(409).json({ error: 'Invoice number already exists' });
      }
      const invoiceId = memIdCounter++;
      memInvoices.push({
        id: invoiceId,
        customer_id,
        invoice_number,
        date,
        due_date,
        notes,
        gst_enabled,
        gst_amount,
        subtotal,
        total_amount,
        status
      });
      services.forEach((s: any) => {
        memServices.push({
          id: memIdCounter++,
          invoice_id: invoiceId,
          description: s.description,
          quantity: s.quantity,
          unit_price: s.unit_price,
          total: s.total
        });
      });
      res.json({ id: invoiceId });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
