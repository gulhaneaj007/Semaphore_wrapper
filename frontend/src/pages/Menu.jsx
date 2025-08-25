import React, { useEffect, useState } from "react";
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Typography, CircularProgress, MenuItem, Select,
  FormControl, InputLabel, Alert, Stack
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const BASE_URL = "http://192.168.0.43:3001";

function Servers() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Server modal
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [provider, setProvider] = useState("proxmox");
  const [error, setError] = useState("");

  const [pxForm, setPxForm] = useState({
    new_vm_name: "",
    vm_memory: "",
    vm_cores: "",
    ci_user: "",
    ci_password: "",
    mysql_password: "",
    ipconfig0: "",
  });

  const [azForm, setAzForm] = useState({
    vm_name: "",
    size: "",
    resource_group: "",
  });

  // Add Replica modal (same Proxmox fields)
  const [replicaOpen, setReplicaOpen] = useState(false);
  const [replicaCreating, setReplicaCreating] = useState(false);
  const [replicaError, setReplicaError] = useState("");
  const [selectedServer, setSelectedServer] = useState(null);
  const [replicaForm, setReplicaForm] = useState({
    new_vm_name: "",
    vm_memory: "",
    vm_cores: "",
    ci_user: "",
    ci_password: "",
    mysql_password: "",
    ipconfig0: "",
  });

  // Load servers
  useEffect(() => {
    fetch(`${BASE_URL}/api/servers`)
      .then((res) => res.json())
      .then((data) => setServers(data || []))
      .catch(() => setServers([]))
      .finally(() => setLoading(false));
  }, []);

  const resetCreateForms = () => {
    setPxForm({
      new_vm_name: "",
      vm_memory: "",
      vm_cores: "",
      ci_user: "",
      ci_password: "",
      mysql_password: "",
      ipconfig0: "",
    });
    setAzForm({
      vm_name: "",
      size: "",
      resource_group: "",
    });
    setProvider("proxmox");
    setError("");
  };

  const resetReplicaForm = () => {
    setReplicaForm({
      new_vm_name: "",
      vm_memory: "",
      vm_cores: "",
      ci_user: "",
      ci_password: "",
      mysql_password: "",
      ipconfig0: "",
    });
    setReplicaError("");
  };

  const handlePxChange = (e) => {
    const { name, value } = e.target;
    setPxForm((s) => ({ ...s, [name]: value }));
  };

  const handleAzChange = (e) => {
    const { name, value } = e.target;
    setAzForm((s) => ({ ...s, [name]: value }));
  };

  const handleReplicaChange = (e) => {
    const { name, value } = e.target;
    setReplicaForm((s) => ({ ...s, [name]: value }));
  };

  const validateProxmoxFields = (data) => {
    const required = ["new_vm_name", "vm_memory", "vm_cores", "ci_user", "ci_password", "mysql_password", "ipconfig0"];
    for (const k of required) {
      if (!data[k] || String(data[k]).trim() === "") {
        return `Please provide: ${k.replace(/_/g, " ")}`;
      }
    }
    if (Number.isNaN(Number(data.vm_memory)) || Number(data.vm_memory) <= 0) {
      return "vm_memory must be a positive number (MiB).";
    }
    if (Number.isNaN(Number(data.vm_cores)) || Number(data.vm_cores) <= 0) {
      return "vm_cores must be a positive number.";
    }
    // Simple ipconfig0 sanity check
    if (!/ip=\d+\.\d+\.\d+\.\d+\/\d+,\s*gw=\d+\.\d+\.\d+\.\d+/i.test(data.ipconfig0)) {
      return "ipconfig0 must look like: ip=192.168.0.39/24,gw=192.168.0.1";
    }
    return "";
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      if (provider === "proxmox") {
        const v = validateProxmoxFields(pxForm);
        if (v) throw new Error(v);

        const res = await fetch(`${BASE_URL}/api/servers/proxmox`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pxForm),
        });
        if (!res.ok) throw new Error(`Create failed (${res.status})`);
        const created = await res.json();
        setServers((s) => [created, ...s]);
        setOpen(false);
        resetCreateForms();
      } else {
        const res = await fetch(`${BASE_URL}/api/servers/azure`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(azForm),
        });
        if (!res.ok) throw new Error(`Create failed (${res.status})`);
        const created = await res.json();
        setServers((s) => [created, ...s]);
        setOpen(false);
        resetCreateForms();
      }
    } catch (err) {
      setError(err.message || "Failed to create server.");
    } finally {
      setCreating(false);
    }
  };

  const openReplicaFor = (server) => {
    setSelectedServer(server);
    resetReplicaForm();

    // Optional: prefill sensible defaults
    setReplicaForm((s) => ({
      ...s,
      new_vm_name: `${server.name || "replica"}-r`,
      vm_memory: server.memory_mib || "",
      vm_cores: server.vcpu || "",
    }));

    setReplicaOpen(true);
  };

  const handleReplicaSubmit = async (e) => {
    e.preventDefault();
    setReplicaError("");
    setReplicaCreating(true);
    try {
      if (!selectedServer) throw new Error("No primary selected.");
      const v = validateProxmoxFields(replicaForm);
      if (v) throw new Error(v);

      // Adjust the endpoint to match your backend
      const res = await fetch(`${BASE_URL}/api/servers/${selectedServer.id}/replica/proxmox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(replicaForm),
      });
      if (!res.ok) throw new Error(`Replica creation failed (${res.status})`);
      const createdReplica = await res.json();

      // Option 1: append to list (if API returns a server-like object)
      setServers((s) => [createdReplica, ...s]);
      // Option 2: refresh all servers (uncomment if needed)
      // const refreshed = await fetch(`${BASE_URL}/api/servers`).then(r => r.json());
      // setServers(refreshed || []);

      setReplicaOpen(false);
      resetReplicaForm();
    } catch (err) {
      setReplicaError(err.message || "Failed to create replica.");
    } finally {
      setReplicaCreating(false);
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Servers</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Create Server
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : servers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No servers found.
                </TableCell>
              </TableRow>
            ) : (
              servers.map((sv) => (
                <TableRow key={sv.id || sv.name}>
                  <TableCell>{sv.name}</TableCell>
                  <TableCell>{sv.provider}</TableCell>
                  <TableCell>{sv.status || "—"}</TableCell>
                  <TableCell>{sv.ip || sv.public_ip || "—"}</TableCell>
                  <TableCell>
                    {sv.created_at ? new Date(sv.created_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openReplicaFor(sv)}
                    >
                      Add Replica
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Server Modal */}
      <Dialog open={open} onClose={() => { setOpen(false); resetCreateForms(); }} maxWidth="sm" fullWidth>
        <DialogTitle>Create Server</DialogTitle>
        <form onSubmit={handleCreateSubmit}>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}

              <FormControl fullWidth>
                <InputLabel id="provider-label">Provider</InputLabel>
                <Select
                  labelId="provider-label"
                  label="Provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <MenuItem value="proxmox">Proxmox</MenuItem>
                  <MenuItem value="azure">Azure</MenuItem>
                </Select>
              </FormControl>

              {provider === "proxmox" ? (
                <>
                  <TextField
                    label="new_vm_name"
                    name="new_vm_name"
                    value={pxForm.new_vm_name}
                    onChange={handlePxChange}
                    fullWidth
                    required
                  />
                  <TextField
                    label="vm_memory (MiB)"
                    name="vm_memory"
                    type="number"
                    value={pxForm.vm_memory}
                    onChange={handlePxChange}
                    fullWidth
                    required
                  />
                  <TextField
                    label="vm_cores"
                    name="vm_cores"
                    type="number"
                    value={pxForm.vm_cores}
                    onChange={handlePxChange}
                    fullWidth
                    required
                  />
                  <TextField
                    label="ci_user"
                    name="ci_user"
                    value={pxForm.ci_user}
                    onChange={handlePxChange}
                    fullWidth
                    required
                  />
                  <TextField
                    label="ci_password"
                    name="ci_password"
                    type="password"
                    value={pxForm.ci_password}
                    onChange={handlePxChange}
                    fullWidth
                    required
                  />
                  <TextField
                    label="mysql_password"
                    name="mysql_password"
                    type="password"
                    value={pxForm.mysql_password}
                    onChange={handlePxChange}
                    fullWidth
                    required
                  />
                  <TextField
                    label="ipconfig0 (e.g. ip=192.168.0.39/24,gw=192.168.0.1)"
                    name="ipconfig0"
                    value={pxForm.ipconfig0}
                    onChange={handlePxChange}
                    fullWidth
                    required
                  />
                </>
              ) : (
                <>
                  {/* Azure placeholder form — extend as needed */}
                  <TextField
                    label="VM Name"
                    name="vm_name"
                    value={azForm.vm_name}
                    onChange={handleAzChange}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Size (e.g., Standard_B2s)"
                    name="size"
                    value={azForm.size}
                    onChange={handleAzChange}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Resource Group"
                    name="resource_group"
                    value={azForm.resource_group}
                    onChange={handleAzChange}
                    fullWidth
                    required
                  />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpen(false); resetCreateForms(); }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Add Replica Modal (Proxmox fields) */}
      <Dialog open={replicaOpen} onClose={() => setReplicaOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Replica {selectedServer?.name ? `for ${selectedServer.name}` : ""}
        </DialogTitle>
        <form onSubmit={handleReplicaSubmit}>
          <DialogContent>
            <Stack spacing={2}>
              {replicaError && <Alert severity="error">{replicaError}</Alert>}

              <TextField
                label="new_vm_name"
                name="new_vm_name"
                value={replicaForm.new_vm_name}
                onChange={handleReplicaChange}
                fullWidth
                required
              />
              <TextField
                label="vm_memory (MiB)"
                name="vm_memory"
                type="number"
                value={replicaForm.vm_memory}
                onChange={handleReplicaChange}
                fullWidth
                required
              />
              <TextField
                label="vm_cores"
                name="vm_cores"
                type="number"
                value={replicaForm.vm_cores}
                onChange={handleReplicaChange}
                fullWidth
                required
              />
              <TextField
                label="ci_user"
                name="ci_user"
                value={replicaForm.ci_user}
                onChange={handleReplicaChange}
                fullWidth
                required
              />
              <TextField
                label="ci_password"
                name="ci_password"
                type="password"
                value={replicaForm.ci_password}
                onChange={handleReplicaChange}
                fullWidth
                required
              />
              <TextField
                label="mysql_password"
                name="mysql_password"
                type="password"
                value={replicaForm.mysql_password}
                onChange={handleReplicaChange}
                fullWidth
                required
              />
              <TextField
                label="ipconfig0 (e.g. ip=192.168.0.39/24,gw=192.168.0.1)"
                name="ipconfig0"
                value={replicaForm.ipconfig0}
                onChange={handleReplicaChange}
                fullWidth
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReplicaOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={replicaCreating}>
              {replicaCreating ? "Creating…" : "Create Replica"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default Servers;
