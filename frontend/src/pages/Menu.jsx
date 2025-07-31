import Button from "../components/Button";

const TASKS = [
  {
    id: 1,
    name: "UI Design",
    priority: "High",
    due: "2025-08-05",
    status: "In Progress",
  },
  {
    id: 2,
    name: "API Integration",
    priority: "Medium",
    due: "2025-08-03",
    status: "Complete",
  },
  {
    id: 3,
    name: "Documentation",
    priority: "Low",
    due: "2025-08-10",
    status: "Pending",
  },
];

const priorityColor = {
  High: "danger",
  Medium: "warning",
  Low: "success",
};

const statusColor = {
  "Complete": "success",
  "In Progress": "warning",
  "Pending": "secondary",
};

function Menu() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome! Here are your current tasks:</p>
      <div className="task-table-container">
        <table className="task-table">
          <thead>
            <tr>
              <th>Task Name</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {TASKS.map((task) => (
              <tr key={task.id}>
                <td>{task.name}</td>
                <td>
                  <span className={`pill pill-${priorityColor[task.priority]}`}>
                    {task.priority}
                  </span>
                </td>
                <td>{task.due}</td>
                <td>
                  <span className={`pill pill-${statusColor[task.status]}`}>
                    {task.status}
                  </span>
                </td>
                <td>
                  <Button style={{
                     padding: '0.25em 0.8em', fontSize: '0.95em', marginRight: '0.5em'
                   }}>Edit</Button>
                  <Button style={{
                     background: '#f8d7da', color: '#a51616', padding: '0.25em 0.8em', fontSize: '0.95em'
                   }}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Menu;
