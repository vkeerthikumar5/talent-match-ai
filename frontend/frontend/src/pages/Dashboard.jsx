// src/pages/Dashboard.jsx
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import DashboardTab from "../components/DashboardTab";
import JobsTab from "../components/JobsTab";
import AnalyticsTab from "../components/AnalyticsTab";
import ProfileTab from "../components/ProfileTab";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard"); // default active tab

  // Render content based on the selected nav item
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />;
      case "jobs":
        return <JobsTab />;
      case "how-to-use":
        return <AnalyticsTab />;
      case "profile":
        return <ProfileTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Right side content */}
      <main className="flex-1 bg-gray-50 p-6 ml-0 sm:ml-64">
        {renderContent()}
      </main>
    </div>
  );
}
