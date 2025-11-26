import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  FaUserCog,
  FaRegFileAlt,
  FaCloudUploadAlt,
  FaBrain,
  FaEnvelopeOpenText,
  FaCheckCircle,
} from "react-icons/fa";

const steps = [
  {
    id: 1,
    title: "Create Jobs Through Chat",
    description:
      "Simply type commands like “Create a job for Full Stack Developer – Python”. TalentMatch will automatically ask for missing mandatory fields like Job Title, Job Type, Salary Range, and Experience Level.",
    icon: <FaUserCog className="text-blue-700 text-4xl" />,
  },
  {
    id: 2,
    title: "Auto-Generated JD & Skills",
    description:
      "Once the job is created, AI instantly generates the job description and required skills. These are saved automatically and can be viewed anytime in the Jobs section.",
    icon: <FaBrain className="text-blue-700 text-4xl" />,
  },
  {
    id: 3,
    title: "Upload Resumes Easily",
    description:
      "Resumes can be uploaded directly in chat or from the job’s dedicated page. Uploading from chat always attaches resumes to the latest created job.",
    icon: <FaCloudUploadAlt className="text-blue-700 text-4xl" />,
  },
  {
    id: 4,
    title: "AI Resume Scoring",
    description:
      "The AI analyzes each resume for skills, projects, experience level, and relevance to the job. It scores candidates out of 100 and generates strengths & weaknesses.",
    icon: <FaRegFileAlt className="text-blue-700 text-4xl" />,
  },
  {
    id: 5,
    title: "Shortlist Top Candidates",
    description:
      "HRs can filter and shortlist candidates based on their AI-generated score, remarks, and relevance to the job requirements.",
    icon: <FaCheckCircle className="text-blue-700 text-4xl" />,
  },
  {
    id: 6,
    title: "Send Emails in One Click",
    description:
      "Once shortlisted, HR can send emails directly from TalentMatch, making the entire screening and communication process seamless.",
    icon: <FaEnvelopeOpenText className="text-blue-700 text-4xl" />,
  },
];

export default function AnalyticsTab() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  return (
    <section className="bg-blue-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          data-aos="fade-up"
          className="text-3xl font-bold text-blue-900 mb-12 text-center"
        >
          How to Use TalentMatch AI
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              data-aos="fade-up"
              data-aos-delay={index * 100}
              className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center hover:shadow-xl transition-shadow duration-300"
            >
              <div className="mb-4">{step.icon}</div>
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                {step.title}
              </h3>
              <p className="text-blue-700 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
