// src/components/Sidebar.jsx
import { useState } from "react";
import {
  FaClipboardList,
  FaInfoCircle,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaTachometerAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { key: "jobs", label: "Jobs", icon: <FaClipboardList /> },
    { key: "how-to-use", label: "How to Use?", icon: <FaInfoCircle /> },
    { key: "profile", label: "Profile", icon: <FaCog /> },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 fixed top-4 left-4 z-50"
      >
        {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 w-64 h-screen transition-transform 
          -translate-x-full sm:translate-x-0
          bg-[url('https://images.pexels.com/photos/3082452/pexels-photo-3082452.jpeg')]
          bg-gray-900 bg-blend-multiply bg-center text-white shadow-lg
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 flex flex-col">
          {/* Logo */}
          <div className="h-24 flex items-center justify-center">
            <h1 className="text-2xl font-bold text-indigo-400">TalentMatch AI</h1>
          </div>

          {/* Nav Items */}
          <ul className="flex-1 space-y-2 font-medium">
            {menuItems.map((item) => (
              <li key={item.key}>
                <button
                  onClick={() => {
                    setActiveTab(item.key);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2 rounded hover:bg-indigo-700/80 w-full ${
                    activeTab === item.key ? "bg-indigo-700/80" : ""
                  }`}
                >
                  {item.icon} <span>{item.label}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 p-2 rounded hover:bg-red-600 w-full"
              >
                <FaSignOutAlt /> Logout
              </button>
            </li>
          </ul>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-40 sm:hidden z-30"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
}
