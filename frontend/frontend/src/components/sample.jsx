// src/pages/JobsTab.jsx
import React, { useState, useEffect } from "react";
import { FaFileAlt, FaCheckCircle, FaUpload, FaStar } from "react-icons/fa";
import api from "../api";

export default function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [candidates, setCandidates] = useState([]);
  const [shortlisted, setShortlisted] = useState({});
  const [selectedResumes, setSelectedResumes] = useState([]);

  // -----------------------------
  // Fetch all jobs
  // -----------------------------
  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const response = await api.get("/jobs/");
      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    }
  }

  // -----------------------------
  // Select a job → fetch candidates
  // -----------------------------
  async function handleSelectJob(job) {
    setSelectedJob(job);
    setActiveTab("info");
    setCandidates([]);
    setShortlisted({});

    try {
      const res = await api.get(`/jobs/${job.id}/candidates/`);
      const cands = (res.data.candidates || []).sort((a, b) => b.score - a.score);
      setCandidates(cands);

      // FIX 1 — load DB shortlist state
      const shortlistMap = {};
      cands.forEach((c) => {
        shortlistMap[c.id] = c.shortlisted === 1 || c.shortlisted === true;
      });
      setShortlisted(shortlistMap);

    } catch (err) {
      console.error("Failed to load candidates:", err);
    }
  }

  // -----------------------------
  // Update shortlist status
  // -----------------------------
  const handleUpdateStatus = async () => {
    if (!selectedResumes.length) return;

    try {
      for (const id of selectedResumes) {
        await api.post(`/candidates/shortlist/${id}/`, {
          shortlisted: !shortlisted[id],
        });
      }

      // FIX 2 — Re-fetch updated candidates
      const candRes = await api.get(`/jobs/${selectedJob.id}/candidates/`);
      const cands = (candRes.data.candidates || []).sort((a, b) => b.score - a.score);
      setCandidates(cands);

      // Rebuild shortlist map
      const map = {};
      cands.forEach((c) => (map[c.id] = c.shortlisted));
      setShortlisted(map);

      setSelectedResumes([]);

    } catch (error) {
      console.error("Failed to update shortlist:", error);
    }
  };

  // -----------------------------
  // Select individual candidates
  // -----------------------------
  const toggleCandidateSelection = (id) => {
    setSelectedResumes((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  // -----------------------------
  // Render UI
  // -----------------------------
  return (
    <div className="p-6">

      {/* Jobs Section */}
      <h2 className="text-2xl font-bold mb-4">Jobs</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => handleSelectJob(job)}
            className={`p-4 rounded-lg border shadow cursor-pointer hover:bg-gray-100
              ${selectedJob?.id === job.id ? "border-blue-600" : ""}
            `}
          >
            <h3 className="font-semibold text-lg">{job.title}</h3>
            <p className="text-sm text-gray-600">Experience: {job.experience_level}</p>
            <p className="text-sm text-gray-600">Type: {job.job_type}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      {selectedJob && (
        <div className="mt-6">
          <div className="flex gap-6 border-b pb-2">
            <button
              className={`${activeTab === "info" ? "font-bold" : ""}`}
              onClick={() => setActiveTab("info")}
            >
              Job Info
            </button>
            <button
              className={`${activeTab === "candidates" ? "font-bold" : ""}`}
              onClick={() => setActiveTab("candidates")}
            >
              Candidates
            </button>
            <button
              className={`${activeTab === "shortlisted" ? "font-bold" : ""}`}
              onClick={() => setActiveTab("shortlisted")}
            >
              Shortlisted
            </button>
          </div>

          {/* Job Info */}
          {activeTab === "info" && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold">{selectedJob.title}</h3>
              <p className="text-gray-700 mt-2">{selectedJob.description}</p>
            </div>
          )}

          {/* Candidates List */}
          {activeTab === "candidates" && (
            <div className="mt-4">
              {candidates.length === 0 ? (
                <p>No candidates uploaded.</p>
              ) : (
                candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="border p-4 rounded-lg mb-3 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-semibold">{cand.name}</h4>
                      <p className="text-sm">Score: {cand.score}</p>
                      <p className="text-sm">Shortlisted: {shortlisted[cand.id] ? "Yes" : "No"}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedResumes.includes(cand.id)}
                        onChange={() => toggleCandidateSelection(cand.id)}
                      />
                      <a
                        href={cand.resume}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 underline text-sm"
                      >
                        View Resume
                      </a>
                    </div>
                  </div>
                ))
              )}

              {selectedResumes.length > 0 && (
                <button
                  onClick={handleUpdateStatus}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Update Status
                </button>
              )}
            </div>
          )}

          {/* Shortlisted Tab */}
          {activeTab === "shortlisted" && (
            <div className="mt-4">
              {candidates.filter((c) => shortlisted[c.id]).length === 0 ? (
                <p>No shortlisted candidates.</p>
              ) : (
                candidates
                  .filter((c) => shortlisted[c.id])
                  .map((cand) => (
                    <div key={cand.id} className="border p-4 rounded-lg mb-3">
                      <h4 className="font-semibold">{cand.name}</h4>
                      <p className="text-sm">Score: {cand.score}</p>
                      <a
                        href={cand.resume}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 underline text-sm"
                      >
                        View Resume
                      </a>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
