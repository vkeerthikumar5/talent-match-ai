import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (!fullName || !email || !password) {
      alert("Please fill all required fields!");
      return;
    }

    try {
      setIsLoading(true);

      const data = {
        full_name: fullName,
        email,
        password,
        organization_name: organization,
        contact_number: phone,
      };

      await api.post("/register/hr/", data);
      alert("Registered successfully! You can now log in.");
      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Registration failed. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Header */}
      <header className="bg-blue-900 text-white text-center py-4 w-full shadow-md">
        <h1 className="text-2xl font-bold">TalentMatch AI</h1>
        <p className="text-sm mt-1">AI-powered candidate shortlisting made simple</p>
      </header>

      {/* Form Section */}
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl w-full mt-10 p-6 bg-white shadow-md rounded-lg"
      >
        <h2 className="text-3xl font-bold text-center text-blue-950 mb-6">
          HR Registration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <input
    type="text"
    placeholder="Full Name"
    value={fullName}
    onChange={(e) => setFullName(e.target.value)}
    className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-900"
    required
  />
  <input
    type="email"
    placeholder="Email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-900"
    required
  />
  <input
    type="password"
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-900"
    required
  />
  <input
    type="password"
    placeholder="Confirm Password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-900"
    required
  />
  <input
    type="text"
    placeholder="Organization / Company Name"
    value={organization}
    onChange={(e) => setOrganization(e.target.value)}
    className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-900"
  />
  <input
    type="tel"
    placeholder="Contact Number"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-900"
  />
</div>


        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex justify-center items-center gap-2"
        >
          {isLoading ? (
            <svg
              aria-hidden="true"
              role="status"
              className="inline w-5 h-5 text-white animate-spin"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.59C100 78.205 77.614 100.59 50 100.59S0 78.205 0 50.59 22.386 0.59 50 0.59 100 22.976 100 50.59z"
                fill="#E5E7EB"
              />
              <path
                d="M93.967 39.04a4 4 0 0 1 3.02-4.832 50 50 0 0 0-5.842-11.31 4 4 0 0 1 6.708-4.39A58 58 0 1 1 81.96 9.837a4 4 0 0 1 4.392 6.709 49.95 49.95 0 0 0 7.615 22.494z"
                fill="currentColor"
              />
            </svg>
          ) : (
            "Register"
          )}
        </button>
      </form>
    </div>
  );
}
