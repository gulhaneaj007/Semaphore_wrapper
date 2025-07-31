import React from "react";

const tabs = [
  { name: "Dashboard", icon: "📊" },
  { name: "Deploy", icon: "🚀" },
  { name: "Inventory", icon: "📦" },
  { name: "Settings", icon: "⚙️" },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-64 bg-white shadow-md h-screen hidden md:block">
      <div className="p-6">
        <h1 className="text-xl font-bold mb-8">My Dashboard</h1>
        <ul>
          {tabs.map((tab, idx) => (
            <li
              key={tab.name}
              className={`flex items-center cursor-pointer px-4 py-3 rounded transition 
                ${activeTab === idx ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-blue-200"}
              `}
              onClick={() => setActiveTab(idx)}
            >
              <span className="mr-3 text-lg">{tab.icon}</span>
              {tab.name}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
