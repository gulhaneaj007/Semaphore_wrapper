import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [launching, setLaunching] = useState(false); // Add this state
  const [form, setForm] = useState({
    credential_name: "",
    api_user: "",
    api_url: "",
    api_token_id: "",
    api_token: "", // Added api_token
  });

  // Fetch users from backend API
  useEffect(() => {
    fetch("http://localhost:3000/api/proxmox_creds")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  // Handle form input
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    fetch("http://localhost:3000/api/proxmox_creds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form), // Now includes api_token
    })
      .then((res) => res.json())
      .then((newUser) => {
        setUsers([...users, newUser]);
        setOpen(false);
        setForm({
          credential_name: "",
          api_user: "",
          api_url: "",
          api_token_id: "",
          api_token: "", // Reset api_token
        });

        // Show loader and call launchVM API
          setLaunching(true);
        fetch("http://192.168.0.43:3000/api/project/1/environment", {
          method: "POST",
          headers: {
            "Authorization": "Bearer vtdgwvof4ifaamne_prhtlwvnzv6brf4nrapw0u61ly=",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "MY_VAR_GROUP",
            project_id: 1,
            json: {
              PROXMOX_APLUSER: form.api_user,
              PROXMOX_APL_TOKEN: form.api_token,
              PROXMOX_APL_URL: form.api_url,
              PROXMOX_APL_TOKEN_ID: form.api_token_id,
            },
          }),
        }).finally(() => setLaunching(false));
      });
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Add User
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Credential Name</TableCell>
              <TableCell>API User</TableCell>
              <TableCell>API URL</TableCell>
              <TableCell>API Token ID</TableCell>
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
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No credentials found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.credential_name}</TableCell>
                  <TableCell>{user.api_user}</TableCell>
                  <TableCell>{user.api_url}</TableCell>
                  <TableCell>{user.api_token_id}</TableCell>
                  <TableCell>
                    {user.created_at
                      ? new Date(user.created_at).toLocaleString()
                      : ""}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {launching && (
        <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
          <CircularProgress size={32} />
          <Typography ml={2}>Launching VM...</Typography>
        </Box>
      )}
      {/* Add Credential Modal */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Credential</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              margin="dense"
              label="Credential Name"
              name="credential_name"
              value={form.credential_name}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              margin="dense"
              label="API User"
              name="api_user"
              value={form.api_user}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              margin="dense"
              label="API URL"
              name="api_url"
              value={form.api_url}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              margin="dense"
              label="API Token ID"
              name="api_token_id"
              value={form.api_token_id}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              margin="dense"
              label="API Token"
              name="api_token"
              value={form.api_token}
              onChange={handleChange}
              fullWidth
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Add
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default Settings