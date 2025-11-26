// src/pages/DashboardTab.jsx
import { useState, useRef, useEffect } from "react";
import { FaGraduationCap, FaPaperPlane, FaPlus } from "react-icons/fa";
import api from "../api";

export default function DashboardTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]); // array of files
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [stats, setStats] = useState({
    jobs: 0,
    candidates: 0,
    shortlisted: 0,
  });
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    api.get("/jobs/stats/")
      .then(res => setStats(res.data))
      .catch(err => console.error("Stats fetch error:", err));
  }, []);
  

  // Handle selected files (multiple)
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const filtered = files.filter((f) =>
      [".pdf", ".txt"].some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (filtered.length !== files.length) {
      alert("⚠️ Only PDF or TXT files allowed. Other files were ignored.");
    }
    setSelectedFiles((prev) => [...prev, ...filtered]);
  };

  // Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    const filtered = files.filter((f) =>
      [".pdf", ".txt"].some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (filtered.length !== files.length) alert("⚠️ Only PDF or TXT allowed.");
    setSelectedFiles((prev) => [...prev, ...filtered]);
  };

  // Remove a selected file from list
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;

    // push user message + file preview(s) to chat
    const newMessages = [...messages];
    if (input.trim()) newMessages.push({ sender: "user", text: input });
    if (selectedFiles.length)
      newMessages.push({
        sender: "user",
        text: `📎 Uploaded: ${selectedFiles.map((f) => f.name).join(", ")}`,
      });

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      if (input) formData.append("message", input);
      // append each file under the same field name 'resume'
      selectedFiles.forEach((file) => {
        formData.append("resume", file);
      });

      // NOTE: backend uses latest job of HR; if you want specific job, append job_id:
      // formData.append("job_id", selectedJobId);

      const response = await api.post("/jobs/chat/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // handle multi-file results
      if (response.data && response.data.results) {
        const results = response.data.results;
        // add each result to chat as ai message (readable)
        results.forEach((r) => {
          if (r.error) {
            setMessages((prev) => [
              ...prev,
              { sender: "ai", text: `⚠️ ${r.filename}: ${r.error}` },
            ]);
          } else {
            // Build readable string summary
            let text = `📄 ${r.filename} — Score: ${r.score}/100\n`;
            if (r.name) text += `Name: ${r.name}\n`;
            if (r.email) text += `Email: ${r.email}\n`;
            if (r.skills_found && r.skills_found.length)
              text += `Skills: ${r.skills_found.join(", ")}\n`;
            if (r.strengths && r.strengths.length) {
              text += `Strengths:\n`;
              r.strengths.forEach((s) => (text += ` • ${s}\n`));
            }
            if (r.weaknesses && r.weaknesses.length) {
              text += `Weaknesses:\n`;
              r.weaknesses.forEach((w) => (text += ` • ${w}\n`));
            }
            setMessages((prev) => [...prev, { sender: "ai", text }]);
          }
        });
      } else {
        // fallback: simple reply text
        const aiReply = response.data.reply || "⚠️ AI didn't respond.";
        setMessages((prev) => [...prev, { sender: "ai", text: aiReply }]);
      }
    } catch (error) {
      console.error("Error communicating with backend:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "⚠️ Server error. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
      // clear selected files
      setSelectedFiles([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 sm:p-6 bg-gray-50">
      
      {/* Stats */}
      {/* Stats */}
<div className="grid grid-cols-3 gap-2 sm:gap-6">
  <div className="bg-white rounded-lg shadow p-2 sm:p-4 text-center">
    <h3 className="text-xs sm:text-lg font-semibold text-gray-700">Jobs</h3>
    <p className="text-lg sm:text-3xl font-bold text-blue-900 mt-1 sm:mt-2">
      {stats.jobs}
    </p>
  </div>

  <div className="bg-white rounded-lg shadow p-2 sm:p-4 text-center">
    <h3 className="text-xs sm:text-lg font-semibold text-gray-700">Candidates</h3>
    <p className="text-lg sm:text-3xl font-bold text-blue-900 mt-1 sm:mt-2">
      {stats.candidates}
    </p>
  </div>

  <div className="bg-white rounded-lg shadow p-2 sm:p-4 text-center">
    <h3 className="text-xs sm:text-lg font-semibold text-gray-700">
      Shortlisted
    </h3>
    <p className="text-lg sm:text-3xl font-bold text-blue-900 mt-1 sm:mt-2">
      {stats.shortlisted}
    </p>
  </div>
</div>

  
      {/* Chat */}
      <div
        className={`flex-1 flex flex-col bg-white rounded-lg shadow overflow-hidden relative transition-all duration-200 ${
          isDragging ? "ring-2 ring-blue-400" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 relative">
          
          {messages.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <div className="text-gray-400 text-4xl sm:text-6xl font-bold opacity-20 flex items-center gap-3">
                <FaGraduationCap /> TM-AI
              </div>
            </div>
          )}
  
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg max-w-[85%] sm:max-w-xl whitespace-pre-wrap break-words ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800 flex items-start gap-2"
                }`}
              >
                {msg.sender === "ai" && <FaGraduationCap className="mt-1" />}
                <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base">
                  {msg.text}
                </pre>
              </div>
            </div>
          ))}
  
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-3 py-2 rounded-lg bg-gray-200 animate-pulse flex items-center gap-2">
                <FaGraduationCap /> AI is typing...
              </div>
            </div>
          )}
  
          <div ref={messagesEndRef} />
        </div>
  
        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="p-2 bg-blue-50 text-sm text-blue-900 border-t border-blue-200">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">Files:</div>
              {selectedFiles.map((f, i) => (
                <div
                  key={i}
                  className="bg-white px-2 py-1 rounded shadow text-xs flex items-center gap-2"
                >
                  <span>📄 {f.name}</span>
                  <button onClick={() => removeFile(i)} className="text-red-500">x</button>
                </div>
              ))}
            </div>
          </div>
        )}
  
        {/* Input bar */}
        {/* Input bar */}
<div className="flex gap-2 p-3 border-t border-gray-200 items-start sm:items-center flex-wrap">
  
  <button
    onClick={() => fileInputRef.current.click()}
    className="p-3 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center justify-center w-10 h-10"
  >
    <FaPlus className="text-gray-600" />
  </button>

  <input
    type="file"
    ref={fileInputRef}
    accept=".pdf,.txt"
    multiple
    className="hidden"
    onChange={handleFileChange}
  />

  {/* Responsive Text Area */}
  <textarea
    className="
      flex-1 w-full sm:w-auto
      border border-gray-300 p-3
      rounded
      focus:outline-none focus:ring-1 focus:ring-blue-900
      resize-none
      text-sm sm:text-base
      min-h-[70px] sm:min-h-[60px]
    "
    placeholder="Type your message..."
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyPress}
    rows={2}
  />

  <button
    onClick={handleSend}
    className="
      p-3 bg-blue-900 text-white rounded-lg
      hover:bg-blue-800 w-10 h-10
      flex items-center justify-center
    "
    disabled={isLoading}
  >
    <FaPaperPlane />
  </button>

</div>

      </div>
    </div>
  );
  
}
