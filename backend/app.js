require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(express.json());

app.use(cors({
  origin: 'http://192.168.0.43:5173', // or use "*" for public access; best to restrict in production!
}));
/** Connection pool **/
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/** Input validation schema **/
const vmSchema = Joi.object({
  vm_name: Joi.string().max(255).required(),
  vm_memory: Joi.number().integer().min(1).required(),
  vm_cores: Joi.number().integer().min(1).required(),
  cloud_init_user: Joi.string().max(50).required(),
  cloud_init_password: Joi.string().min(6).max(255).required(),
  cloud_init_ipconfig: Joi.string().max(100).required(),
  cloud_init_nameservers: Joi.string().max(100).required()
});

/** Insert VM Configuration API **/
app.post('/api/vms', async (req, res) => {
  // Validate input
  const { error, value } = vmSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const {
    vm_name, vm_memory, vm_cores,
    cloud_init_user, cloud_init_password,
    cloud_init_ipconfig, cloud_init_nameservers
  } = value;

  try {
    // Hash the password!
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(cloud_init_password, saltRounds);

    // Insert into database
    const sql = `
      INSERT INTO proxmox_vm_configurations
      (vm_name, vm_memory, vm_cores, cloud_init_user, cloud_init_password, cloud_init_ipconfig, cloud_init_nameservers)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      vm_name, vm_memory, vm_cores,
      cloud_init_user, hashedPassword,
      cloud_init_ipconfig, cloud_init_nameservers
    ];

    const [result] = await pool.execute(sql, params);
    res.status(201).json({ id: result.insertId, message: "VM configuration created." });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: "VM name must be unique." });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/** GET API to fetch all proxmox_creds **/
app.get('/api/proxmox_creds', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, created_at, credential_name, api_user, api_url, api_token_id FROM proxmox_creds');
    // Do not return api_token directly for security reasons
    // If you want to include it, be aware of the risk!

    res.json(rows);
  } catch (error) {
    console.error('Database query failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** Input validation schema for proxmox_creds **/
const credsSchema = Joi.object({
  credential_name: Joi.string().max(255).required(),
  api_user: Joi.string().max(255).required(),
  api_token: Joi.string().max(255).allow('').optional(), // allow empty if not required
  api_url: Joi.string().max(255).required(),
  api_token_id: Joi.string().max(255).required()
});

/** POST API to insert a new proxmox_cred **/
app.post('/api/proxmox_creds', async (req, res) => {
  // Validate input
  const { error, value } = credsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const { credential_name, api_user, api_token, api_url, api_token_id } = value;

  try {
    const sql = `
      INSERT INTO proxmox_creds (credential_name, api_user, api_token, api_url, api_token_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [credential_name, api_user, api_token, api_url, api_token_id];
    const [result] = await pool.execute(sql, params);

    // Fetch the inserted row to return (including created_at)
    const [rows] = await pool.query(
      'SELECT id, created_at, credential_name, api_user, api_url, api_token_id FROM proxmox_creds WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Insert failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/project/1/environment', async (req, res) => {
  try {
    const response = await fetch('http://192.168.0.43:3000/api/project/1/environment', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer vtdgwvof4ifaamne_prhtlwvnzv6brf4nrapw0u61ly=',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
