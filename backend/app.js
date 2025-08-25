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
  origin: 'http://localhost:5173', // adjust for your frontend origin
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

/* ------------------------------------------------------------------
   VM Configuration APIs (your original code)
------------------------------------------------------------------- */

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
  const { error, value } = vmSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const {
    vm_name, vm_memory, vm_cores,
    cloud_init_user, cloud_init_password,
    cloud_init_ipconfig, cloud_init_nameservers
  } = value;

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(cloud_init_password, saltRounds);

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
    const [rows] = await pool.query(
      'SELECT id, created_at, credential_name, api_user, api_url, api_token_id FROM proxmox_creds'
    );
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
  api_token: Joi.string().max(255).allow('').optional(),
  api_url: Joi.string().max(255).required(),
  api_token_id: Joi.string().max(255).required()
});

/** POST API to insert a new proxmox_cred **/
app.post('/api/proxmox_creds', async (req, res) => {
  const { error, value } = credsSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { credential_name, api_user, api_token, api_url, api_token_id } = value;

  try {
    const sql = `
      INSERT INTO proxmox_creds (credential_name, api_user, api_token, api_url, api_token_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [credential_name, api_user, api_token, api_url, api_token_id];
    const [result] = await pool.execute(sql, params);

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

/** Proxy endpoint (Semaphore API) **/
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

/* ------------------------------------------------------------------
   Servers APIs (new code for masters & replicas)
------------------------------------------------------------------- */

// Schema for master servers
const serverSchema = Joi.object({
  new_vm_name: Joi.string().max(128).required(),
  vm_memory: Joi.number().integer().min(1).required(),
  vm_cores: Joi.number().integer().min(1).required(),
  ci_user: Joi.string().max(64).required(),
  ci_password: Joi.string().min(6).max(255).required(),
  mysql_password: Joi.string().min(6).max(255).required(),
  ipconfig0: Joi.string().max(255).required(),
  is_master: Joi.string().max(128).required(),   // "master" or master name
  provider: Joi.string().max(128).required()
});

// Create a new server (master)
app.post('/api/servers', async (req, res) => {
  const { error, value } = serverSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const {
    new_vm_name, vm_memory, vm_cores,
    ci_user, ci_password, mysql_password,
    ipconfig0, is_master, provider
  } = value;

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedCiPassword = await bcrypt.hash(ci_password, saltRounds);
    const hashedMysqlPassword = await bcrypt.hash(mysql_password, saltRounds);

    const sql = `
      INSERT INTO servers
      (new_vm_name, vm_memory, vm_cores, ci_user, ci_password, mysql_password, ipconfig0, is_master, provider)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      new_vm_name, vm_memory, vm_cores,
      ci_user, hashedCiPassword, hashedMysqlPassword,
      ipconfig0, is_master, provider
    ];

    const [result] = await pool.execute(sql, params);
    const [rows] = await pool.query(
      'SELECT id, new_vm_name, vm_memory, vm_cores, ci_user, ipconfig0, is_master, provider, created_at FROM servers WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: "Server name must be unique." });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all servers
app.get('/api/servers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, new_vm_name, vm_memory, vm_cores, ci_user, ipconfig0, is_master, provider, created_at FROM servers'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Schema for replicas (is_master derived from parent)
const replicaSchema = Joi.object({
  new_vm_name: Joi.string().max(128).required(),
  vm_memory: Joi.number().integer().min(1).required(),
  vm_cores: Joi.number().integer().min(1).required(),
  ci_user: Joi.string().max(64).required(),
  ci_password: Joi.string().min(6).max(255).required(),
  mysql_password: Joi.string().min(6).max(255).required(),
  ipconfig0: Joi.string().max(255).required(),
  provider: Joi.string().max(128).optional()
});

// Create a replica tied to a master
app.post('/api/servers/:id/replica', async (req, res) => {
  const { error, value } = replicaSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const [parents] = await pool.query(
      'SELECT id, new_vm_name, is_master, provider FROM servers WHERE id = ?',
      [req.params.id]
    );
    if (parents.length === 0) return res.status(404).json({ error: 'Parent server not found' });
    const parent = parents[0];

    const masterName = (parent.is_master && parent.is_master.toLowerCase() !== 'master')
      ? parent.is_master
      : parent.new_vm_name;

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedCiPassword = await bcrypt.hash(value.ci_password, saltRounds);
    const hashedMysqlPassword = await bcrypt.hash(value.mysql_password, saltRounds);

    const provider = value.provider || parent.provider || 'proxmox';

    const sql = `
      INSERT INTO servers
      (new_vm_name, vm_memory, vm_cores, ci_user, ci_password, mysql_password, ipconfig0, is_master, provider)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      value.new_vm_name, value.vm_memory, value.vm_cores,
      value.ci_user, hashedCiPassword, hashedMysqlPassword,
      value.ipconfig0, masterName, provider
    ];

    const [result] = await pool.execute(sql, params);
    const [rows] = await pool.query(
      `SELECT id, new_vm_name, vm_memory, vm_cores, ci_user, ipconfig0, is_master, provider, created_at
       FROM servers WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: "Server name must be unique." });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Alias: /replica/proxmox
app.post('/api/servers/:id/replica/proxmox', (req, res, next) => {
  req.body.provider = req.body.provider || 'proxmox';
  app._router.handle(
    { ...req, url: `/api/servers/${req.params.id}/replica`, method: 'POST' },
    res,
    next
  );
});

// List replicas for a master
app.get('/api/servers/:id/replicas', async (req, res) => {
  try {
    const [parents] = await pool.query(
      'SELECT id, new_vm_name, is_master FROM servers WHERE id = ?',
      [req.params.id]
    );
    if (parents.length === 0) return res.status(404).json({ error: 'Parent server not found' });

    const parent = parents[0];
    const masterName = (parent.is_master && parent.is_master.toLowerCase() !== 'master')
      ? parent.is_master
      : parent.new_vm_name;

    const [rows] = await pool.query(
      `SELECT id, new_vm_name, vm_memory, vm_cores, ci_user, ipconfig0, is_master, provider, created_at
       FROM servers
       WHERE is_master = ? AND new_vm_name <> ?`,
      [masterName, masterName]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------------------------------------------------------------
   Start server
------------------------------------------------------------------- */
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
