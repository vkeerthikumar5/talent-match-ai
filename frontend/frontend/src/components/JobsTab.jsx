// src/pages/JobsTab.jsx
import React, { useState, useEffect } from "react";
import { FaFileAlt, FaCheckCircle, FaUpload, FaStar } from "react-icons/fa";
import api from "../api";

export default function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [candidates, setCandidates] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedResumes, setSelectedResumes] = useState([]);
  const [shortlisted, setShortlisted] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ experience: "", score: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCandidate, setModalCandidate] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const res = await api.get("/jobs/list/");
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
  }

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    message: "",
  });
  const [emailAttachments, setEmailAttachments] = useState([]);

  const handleSendFinalEmail = async () => {
    try {
      const formData = new FormData();
      formData.append("to", emailForm.to);
      formData.append("cc", emailForm.cc);
      formData.append("bcc", emailForm.bcc);
      formData.append("subject", emailForm.subject);
      formData.append("message", emailForm.message);

      emailAttachments.forEach((file) => {
        formData.append("attachments", file);
      });

      await api.post("/candidates/send-email/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Email sent successfully!");
      setEmailModalOpen(false);
      setEmailAttachments([]);

    } catch (err) {
      console.error(err);
      alert("Failed to send email");
    }
  };


  async function handleSelectJob(job) {
    setSelectedJob(job);
    setActiveTab("info");
    setCandidates([]);
    setUploadedFiles([]);
    setSelectedResumes([]);
    setShortlisted({});
    try {
      const res = await api.get(`/candidates/job/${job.id}/`);
      const cands = (res.data.candidates || []).sort((a, b) => b.score - a.score);

      console.log("API RAW CANDIDATE DATA:", res.data.candidates);  // ⬅️ DEBUG HERE
      console.log("CANDIDATES AFTER SET:", cands);

      setCandidates(cands);

      const shortlistMap = {};
      cands.forEach(c => {
        shortlistMap[c.id] = c.shortlisted;
      });
      setShortlisted(shortlistMap);



    } catch (err) {
      console.error("Failed to load candidates:", err);
      setCandidates([]);
    }
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!selectedJob) return alert("Select a job first.");

    const localFiles = files.map((file, idx) => ({
      id: `local-${Date.now()}-${idx}`,
      name: file.name.split(".")[0],
      file,
      sizeKB: file.size ? (file.size / 1024).toFixed(1) : "",
    }));
    setUploadedFiles((prev) => [...localFiles, ...prev]);
  };

  const handleEvaluateResumes = async () => {
    if (!uploadedFiles.length) return alert("No files to evaluate.");
    const formData = new FormData();
    uploadedFiles.forEach((f) => formData.append("resume", f.file));
    formData.append("job_id", selectedJob.id);

    try {
      const res = await api.post("/jobs/chat/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const candRes = await api.get(`/jobs/${selectedJob.id}/candidates/`);
      const cands = (candRes.data.candidates || []).sort((a, b) => b.score - a.score);
      setCandidates(cands);
      setUploadedFiles([]);
      alert(res.data.reply || "Evaluation completed");
    } catch (err) {
      console.error(err);
      alert("Evaluation failed");
    }
  };

  const handleOpenResume = (urlOrFile) => {
    if (!urlOrFile) return;
    const url = typeof urlOrFile === "string" ? urlOrFile : URL.createObjectURL(urlOrFile);
    window.open(url, "_blank");
  };

  const toggleSelect = (id) => {
    setSelectedResumes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleUpdateStatus = async () => {
    if (!selectedResumes.length) return;

    try {
      // Optimistically update the UI first
      const newShortlist = { ...shortlisted };
      selectedResumes.forEach(id => {
        newShortlist[id] = !newShortlist[id];
      });
      setShortlisted(newShortlist);

      // Update backend
      for (const id of selectedResumes) {
        await api.post(`/candidates/shortlist/${id}/`, {
          shortlisted: newShortlist[id]
        });
      }

      setSelectedResumes([]);
      alert("Status Updated");
    } catch (error) {
      console.error("Failed to update shortlist:", error);
    }
  };




  const handleSendEmail = () => {
    const list = candidates
      .filter((c) => shortlisted[c.id])
      .map((c) => c.email);


    if (!list.length) {
      alert("No shortlisted candidates.");
      return;
    }
    console.log("Our List: ", list)
    setEmailForm({
      to: list.join(", "),
      cc: "",
      bcc: "",
      subject: "",
      message: "",
    });

    setEmailModalOpen(true);
  };


  const handleOpenModal = (candidate) => {
    setModalCandidate(candidate);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalCandidate(null);
    setModalOpen(false);
  };

  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    const matchesExperience = !filters.experience || c.experience_level === filters.experience;
    const matchesScore = !filters.score || c.score >= parseInt(filters.score);
    return matchesSearch && matchesExperience && matchesScore;
  });

  return (
    <div className="p-6">
      {!selectedJob ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.length === 0 && <div className="col-span-full text-center text-gray-500">No jobs yet.</div>}
          {jobs.map((job) => (
            <div key={job.id} className="bg-white shadow-lg rounded-lg p-6 flex flex-col justify-between hover:shadow-xl transition">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{job.title}</h2>
                <p className="text-gray-600 mt-2 text-sm text-justify">{job.description}</p>
                <div className="mt-4 space-y-1 text-gray-700">
                  <p><strong>Salary:</strong> {job.salary_range}</p>
                  <p><strong>Experience:</strong> {job.experience_level}</p>
                  <p><strong>Type:</strong> {job.job_type}</p>
                  <p className="text-sm"><strong>Skills:</strong> {job.skills?.join(", ")}</p>
                </div>
              </div>
              <button onClick={() => handleSelectJob(job)} className="mt-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">View Details</button>
            </div>
          ))}
        </div>
      ) : (
        <>
          <button onClick={() => setSelectedJob(null)} className="mb-4 text-blue-900 font-semibold hover:underline">&larr; Back to Jobs</button>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{selectedJob.title}</h2>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <ul className="flex flex-wrap -mb-px text-sm font-medium text-center w-full" role="tablist">
              {["info", "resumes", "scores", "shortlisted"].map((tab) => (
                <li className="mr-2 w-full sm:w-auto" key={tab} role="presentation">
                  <button
                    onClick={() => setActiveTab(tab)}
                    role="tab"
                    className={`inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg w-full
            ${activeTab === tab
                        ? "border-blue-900 text-blue-900"
                        : "border-transparent text-gray-700 hover:text-blue-900 hover:border-gray-300"
                      }`
                    }
                  >
                    {tab === "info" && <><FaFileAlt className="inline mr-2" /> Job Info</>}
                    {tab === "resumes" && <><FaUpload className="inline mr-2" /> Resumes</>}
                    {tab === "scores" && <><FaStar className="inline mr-2" /> Candidate Scores</>}
                    {tab === "shortlisted" && <><FaCheckCircle className="inline mr-2" /> Shortlisted</>}
                  </button>
                </li>
              ))}
            </ul>
          </div>



          {/* Info Tab */}
          {activeTab === "info" && (
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <p><strong>Description:</strong> {selectedJob.description}</p>
              <p><strong>Skills:</strong> {selectedJob.skills?.join(", ")}</p>
              <p><strong>Experience:</strong> {selectedJob.experience_level}</p>
              <p><strong>Salary:</strong> {selectedJob.salary_range}</p>
            </div>
          )}

          {/* Resume Tab */}
          {activeTab === "resumes" && (
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <label className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-800">
                <FaUpload /> Upload Resumes
                <input type="file" multiple className="hidden" onChange={handleFileUpload} />
              </label>
              <button onClick={handleEvaluateResumes} className="mt-2 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-500">Evaluate</button>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Existing & Uploaded Resumes:</h3>
                <ul className="space-y-1">
                  {uploadedFiles.concat(candidates.map(c => ({
                    id: c.id,
                    name: c.name,
                    file: c.resume_url,
                  }))).map(f => (
                    <li key={f.id} className="px-3 py-2 bg-gray-100 rounded flex justify-between cursor-pointer hover:bg-gray-200" onClick={() => handleOpenResume(f.file)}>
                      <span>{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Scores Tab */}
          {activeTab === "scores" && (
            <div className="bg-white p-4 md:p-6 rounded-lg shadow w-screen ">


              {/* Modern Search Bar */}
              <div className="w-full mb-4">

                <div className="relative w-screen">

                  {/* Search Icon */}
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeWidth="2"
                        d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                      />
                    </svg>
                  </span>

                  {/* Input */}
                  <input
                    type="search"
                    id="search"
                    placeholder="Search candidates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-xl bg-white/80 backdrop-blur-sm border border-gray-300 p-3 pl-10 shadow-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                  />

                  {/* Search Button */}
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 transition"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-4 w-full">


                {/* Experience Filter */}
                <select
                  value={filters.experience}
                  onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                  className="border border-gray-300 rounded-xl px-4 py-2 bg-white shadow-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition text-sm"
                >
                  <option value="">All Experience</option>
                  <option value="Fresher">Fresher</option>
                  <option value="1-2 Years">1-2 Years</option>
                  <option value="3+ Years">3+ Years</option>
                </select>

                {/* Score Filter */}
                <select
                  value={filters.score}
                  onChange={(e) => setFilters({ ...filters, score: e.target.value })}
                  className="border border-gray-300 rounded-xl px-4 py-2 bg-white shadow-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition text-sm"
                >
                  <option value="">All Scores</option>
                  <option value="40">Above 40</option>
                  <option value="70">Above 70</option>
                  <option value="85">Above 85</option>
                </select>

              </div>

              {/* Candidates Table */}
              {/* Candidates Table */}
              <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow block">
                <table className="w-full min-w-full divide-y divide-gray-200">



                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedResumes(filteredCandidates.map(c => c.id));
                            } else {
                              setSelectedResumes([]);
                            }
                          }}
                          checked={
                            filteredCandidates.length > 0 &&
                            selectedResumes.length === filteredCandidates.length
                          }
                        />

                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Experience</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Score</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Resume</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remarks</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Shortlisted</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredCandidates.map((c, idx) => {
                      const checked = selectedResumes.includes(c.id);

                      const score = c.score || 0;

                      const scoreColor =
                        score <= 40
                          ? "bg-red-100 text-red-800"
                          : score <= 70
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800";

                      return (
                        <tr key={c.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 rounded"
                              checked={selectedResumes.includes(c.id)}
                              onChange={() => toggleSelect(c.id)}
                            />


                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{c.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{c.experience_level || "N/A"}</td>

                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${scoreColor}`}>
                              {score}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {c.resume_url ? (
                              <button
                                className="text-blue-700 font-medium underline"
                                onClick={() => handleOpenResume(c.resume_url)}
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <button
                              className="text-indigo-700 underline font-medium"
                              onClick={() => handleOpenModal(c)}
                            >
                              Open
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {shortlisted[c.id] ? "Yes" : "No"}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleUpdateStatus}
                className="mt-4 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-500"
              >
                Update Status
              </button>


            </div>
          )}

          {/* Shortlisted Tab */}
          {activeTab === "shortlisted" && (
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <div className="w-screen overflow-x-auto rounded-lg border border-gray-200 shadow block">
                <table className="w-screen divide-y divide-gray-200">



                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedResumes(filteredCandidates.map(c => c.id));
                            } else {
                              setSelectedResumes([]);
                            }
                          }}
                          checked={
                            filteredCandidates.length > 0 &&
                            selectedResumes.length === filteredCandidates.length
                          }
                        />

                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Experience</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Score</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Resume</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remarks</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Shortlisted</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCandidates
                      .filter(c => shortlisted[c.id])
                      .map((c, idx) => (
                        <tr
                          key={c.id}
                          className="bg-gray-50 hover:bg-gray-100 transition rounded-lg shadow-sm"
                        >
                          <td className="py-3 px-4 rounded-l-lg text-gray-700">{idx + 1}</td>
                          <td className="py-3 px-4 text-gray-900 font-medium">{c.name}</td>
                          <td className="py-3 px-4 text-gray-700">{c.email}</td>
                          <td className="py-3 px-4 text-gray-700">
                            {c.experience_level || "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${c.score >= 85
                                ? "bg-green-100 text-green-700"
                                : c.score >= 70
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                                }`}
                            >
                              {c.score}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {c.resume_url && (
                              <button
                                className="text-blue-700 font-medium hover:text-blue-900 underline"
                                onClick={() => handleOpenResume(c.resume_url)}
                              >
                                Open
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-4 rounded-r-lg">
                            <button
                              className="text-indigo-700 font-medium hover:text-indigo-900 underline"
                              onClick={() => handleOpenModal(c)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Modern CTA Button */}
                {Object.keys(shortlisted).length > 0 && (
                  <button
                    onClick={handleSendEmail}
                    className="mt-6 px-5 py-2.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition shadow-md"
                  >
                    Send Email to Shortlisted
                  </button>
                )}
              </div>
            </div>
          )}

        </>
      )}

      {/* Candidate Modal */}
      {modalOpen && modalCandidate && (
        <div
          id="default-modal"
          tabIndex="-1"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-lg">

            {/* Close Button */}
            <button
              type="button"
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
              onClick={handleCloseModal}
            >
              ×
            </button>

            {/* Modal Content */}
            <div className="px-6 py-5">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {modalCandidate.name}
              </h3>

              <div className="space-y-2 text-gray-700">
                <p>
                  <strong>Email:</strong> {modalCandidate.email || "N/A"}
                </p>
                <p>
                  <strong>Experience:</strong> {modalCandidate.experience_level || "N/A"}
                </p>
                <p>
                  <strong>Strengths:</strong>{" "}
                  {modalCandidate.strengths?.length
                    ? modalCandidate.strengths.join(", ")
                    : "N/A"}
                </p>
                <p>
                  <strong>Weaknesses:</strong>{" "}
                  {modalCandidate.weaknesses?.length
                    ? modalCandidate.weaknesses.join(", ")
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-white bg-blue-900 rounded hover:bg-blue-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 animate-fadeIn">

            <h2 className="text-xl font-semibold mb-4">Send Email to Shortlisted Candidates</h2>

            {/* To */}
            <label className="font-medium">To</label>
            <input
              type="text"
              value={emailForm.to}
              readOnly
              className="w-full p-2 border rounded mb-3 bg-gray-100"
            />

            {/* CC */}
            <label className="font-medium">CC</label>
            <input
              type="text"
              className="w-full p-2 border rounded mb-3"
              value={emailForm.cc}
              onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
            />

            {/* BCC */}
            <label className="font-medium">BCC</label>
            <input
              type="text"
              className="w-full p-2 border rounded mb-3"
              value={emailForm.bcc}
              onChange={(e) => setEmailForm({ ...emailForm, bcc: e.target.value })}
            />

            {/* Subject */}
            <label className="font-medium">Subject</label>
            <input
              type="text"
              className="w-full p-2 border rounded mb-3"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
            />

            {/* Message */}
            <label className="font-medium">Message</label>
            <textarea
              rows="4"
              className="w-full p-2 border rounded mb-3"
              value={emailForm.message}
              onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
            ></textarea>

            {/* Attachments */}
            <label className="font-medium">Attachments</label>
            <input
              type="file"
              multiple
              className="w-full p-2 border rounded mb-3"
              onChange={(e) => setEmailAttachments(Array.from(e.target.files))}
            />

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSendFinalEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

    </div>


  );
}
