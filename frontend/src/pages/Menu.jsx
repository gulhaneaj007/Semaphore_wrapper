import React, { useEffect, useState } from "react";
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Typography, CircularProgress, MenuItem, Select,
  FormControl, InputLabel, Alert, Stack
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

function Servers() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [provider, setProvider] = useState("proxmox"); // default
  const [error, setError] = useState("");

  // Proxmox form state
  const [pxForm, setPxForm] = useState({
    new_vm_name: "",
    vm_memory: "",
    vm_cores: "",
    ci_user: "",
    ci_password: "",
    mysql_password: "",
    ipconfig0: "",
  });

  // Azure form (placeholder you can extend)
  const [azForm, setAzForm] = useState({
    vm_name: "",
    size: "",
    resource_group: "",
  });

  // Fetch servers from backend API
  useEffect(() => {
    fetch("http://192.168.0.43:3001/api/servers")
      .then((res) => res.json())
      .then((data) => setServers(data || []))
      .catch(() => setServers([]))
      .finally(() => setLoading(false));
  }, []);

  const resetForms = () => {
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

  const handlePxChange = (e) => {
    const { name, value } = e.target;
    setPxForm((s) => ({ ...s, [name]: value }));
  };

  const handleAzChange = (e) => {
    const { name, value } = e.target;
    setAzForm((s) => ({ ...s, [name]: value }));
  };

  const validateProxmox = () => {
    const required = ["new_vm_name", "vm_memory", "vm_cores", "ci_user", "ci_password", "mysql_password", "ipconfig0"];
    for (const k of required) {
      if (!pxForm[k] || String(pxForm[k]).trim() === "") {
        setError(`Please provide: ${k.replace(/_/g, " ")}`);
        return false;
      }
    }
    if (Number.isNaN(Number(pxForm.vm_memory)) || Number(pxForm.vm_memory) <= 0) {
      setError("vm_memory must be a positive number (MiB).");
      return false;
    }
    if (Number.isNaN(Number(pxForm.vm_cores)) || Number(pxForm.vm_cores) <= 0) {
      setError("vm_cores must be a positive number.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setCreating(true);

      if (provider === "proxmox") {
        if (!validateProxmox()) {
          setCreating(false);
          return;
        }

        // POST to your backend endpoint that triggers the Proxmox Ansible workflow
        // Adjust the route/body shape to match your API
        const res = await fetch("http://192.168.0.43:3001/api/servers/proxmox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pxForm),
        });

        if (!res.ok) throw new Error(`Create failed (${res.status})`);
        const created = await res.json();

        setServers((s) => [created, ...s]);
        setOpen(false);
        resetForms();
      } else {
        // Azure placeholder
        const res = await fetch("http://192.168.0.43:3001/api/servers/azure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(azForm),
        });
        if (!res.ok) throw new Error(`Create failed (${res.status})`);
        const created = await res.json();
        setServers((s) => [created, ...s]);
        setOpen(false);
        resetForms();
      }
    } catch (err) {
      setError(err.message || "Failed to create server.");
    } finally {
      setCreating(false);
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
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : servers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Server Modal */}
      <Dialog open={open} onClose={() => { setOpen(false); resetForms(); }} maxWidth="sm" fullWidth>
        <DialogTitle>Create Server</DialogTitle>
        <form onSubmit={handleSubmit}>
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
            <Button onClick={() => { setOpen(false); resetForms(); }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default Servers;
