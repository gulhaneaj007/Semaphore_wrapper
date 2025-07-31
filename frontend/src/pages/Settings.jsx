function Settings() {
  return (
    <div>
      <h1>Settings</h1>
      <label style={{ display: "block", margin: "1rem 0" }}>
        <input type="checkbox" defaultChecked /> Enable notifications
      </label>
      <label style={{ display: "block", margin: "1rem 0" }}>
        <input type="checkbox" /> Dark mode
      </label>
    </div>
  );
}
export default Settings;
