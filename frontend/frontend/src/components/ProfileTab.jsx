import React, { useEffect, useState } from "react";
import api from "../api";

export default function ProfileTab() {
  const [profile, setProfile] = useState(null);
  const [passwords, setPasswords] = useState({
    old_password: "",
    new_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/profile/");
      setProfile(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const updateProfile = async () => {
    try {
      setSaving(true);
      await api.put("/profile/", profile);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    try {
      setPasswordLoading(true);
      await api.put("/profile/update-password/", passwords);
      alert("Password updated!");
      setPasswords({ old_password: "", new_password: "" });
    } catch (err) {
      alert("Old password is incorrect!");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading || !profile) {
    return <div className="text-center mt-10 text-xl">Loading profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">

      <h2 className="text-3xl font-bold text-blue-900 text-center mb-6">
        My Profile
      </h2>

      {/* PROFILE FORM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <input
          type="text"
          value={profile.full_name}
          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-900"
          placeholder="Full Name"
        />

        <input
          type="email"
          value={profile.email}
          disabled
          className="border p-3 rounded-lg bg-gray-100 text-gray-500"
        />

        <input
          type="text"
          value={profile.organization_name || ""}
          onChange={(e) =>
            setProfile({ ...profile, organization_name: e.target.value })
          }
          className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-900"
          placeholder="Organization Name"
        />

        <input
          type="text"
          value={profile.contact_number || ""}
          onChange={(e) =>
            setProfile({ ...profile, contact_number: e.target.value })
          }
          className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-900"
          placeholder="Contact Number"
        />
      </div>

      {/* SAVE BUTTON */}
      <button
        onClick={updateProfile}
        className="mt-6 w-full bg-blue-900 text-white py-3 rounded-xl hover:bg-blue-800 transition"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* PASSWORD SECTION */}
      <h3 className="text-xl font-semibold mt-10 mb-3 text-blue-900">
        Change Password
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="password"
          placeholder="Old Password"
          value={passwords.old_password}
          onChange={(e) =>
            setPasswords({ ...passwords, old_password: e.target.value })
          }
          className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-900"
        />

        <input
          type="password"
          placeholder="New Password"
          value={passwords.new_password}
          onChange={(e) =>
            setPasswords({ ...passwords, new_password: e.target.value })
          }
          className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-900"
        />
      </div>

      <button
        onClick={updatePassword}
        className="mt-4 w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-500"
      >
        {passwordLoading ? "Updating..." : "Update Password"}
      </button>
    </div>
  );
}
