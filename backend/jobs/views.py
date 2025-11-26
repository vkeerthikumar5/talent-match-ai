# jobs/views.py
import json
import re
import PyPDF2
import uuid
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Job
import google.generativeai as genai

genai.configure(api_key=settings.GEMINI_API_KEY)

# helpers
def extract_json(text):
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        cleaned = text.replace("```json", "").replace("```", "").strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    return json.loads(match.group()) if match else None

def extract_array(text):
    match = re.search(r"\[.*\]", text, re.DOTALL)
    return json.loads(match.group()) if match else []

def pdf_to_text(file):
    text = ""
    try:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() or ""
    except Exception:
        pass
    return text

def truncate(text, max_chars=15000):
    if len(text) <= max_chars:
        return text
    return text[:7000] + "\n...\n" + text[-6000:]


# Main API view kept (chat & resume processing)
# jobs/views.py  (only the updated JobChatAPIView + helpers shown here)
import json
import re
import PyPDF2
import uuid
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Job
import google.generativeai as genai

genai.configure(api_key=settings.GEMINI_API_KEY)

# -----------------------------
# Helpers
# -----------------------------
def extract_json(text):
    """Safely extract a JSON object from model output."""
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        cleaned = text.replace("```json", "").replace("```", "").strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    try:
        return json.loads(match.group()) if match else None
    except Exception:
        return None

def extract_array(text):
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        return []
    try:
        return json.loads(match.group())
    except Exception:
        return []

def pdf_to_text(file):
    text = ""
    try:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() or ""
    except Exception:
        pass
    return text

def truncate(text, max_chars=15000):
    if len(text) <= max_chars:
        return text
    return text[:7000] + "\n...\n" + text[-6000:]

# -----------------------------
# Main view
# -----------------------------
class JobChatAPIView(APIView):
    """
    POST /api/jobs/chat/
    - If `resume` files present -> evaluate and save candidates (expected job_id in form or fallback to latest job)
    - Else -> chat flow for:
       * friendly greetings
       * find previously created job by user message
       * create job from conversation (LLM)
       * simple commands: count resumes, count above X, shortlist above X (either preview or apply)
    """
    permission_classes = [permissions.IsAuthenticated]
    conversation = []
    REQUIRED_FIELDS = ["job_title", "salary_range", "experience_level", "job_type"]

    def clean_json_array(self, text):
        match = re.search(r"\[.*?\]", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                return []
        return []

    def parse_shortlist_command(self, text):
        """
        Detect phrases like:
          - 'shortlist above 65'
          - 'shortlist >= 65'
          - 'shortlist all above 65'
          - 'mark shortlist above 65'
        Returns (threshold:int or None, apply:bool)
        apply True means user likely asked to apply/save shortlist (verbs: mark/set/shortlist all)
        """
        if not text:
            return None, False
        # threshold
        m = re.search(r"shortlist(?:\s+all)?(?:\s+above|\s+>=|\s+>|\s+greater than|\s+over)?\s*(\d{1,3})", text, re.IGNORECASE)
        if not m:
            return None, False
        try:
            threshold = int(m.group(1))
            threshold = max(0, min(100, threshold))
        except:
            return None, False

        # apply if verbs like 'mark', 'set', 'shortlist all', 'shortlist and mark', 'please shortlist' with 'all' etc.
        verbs_apply = bool(re.search(r"\b(mark|set|apply|save|shortlist\s+all|please\s+shortlist|shortlist\s+and)\b", text, re.IGNORECASE))
        return threshold, verbs_apply

    def parse_count_command(self, text):
        """
        Detect count queries:
          - how many candidates
          - how many resumes
          - how many above 75
        Returns dict: {"type": "total"|"above", "threshold": int|None}
        """
        lowered = (text or "").lower()
        if re.search(r"how many (resumes|candidates|applications|applicants)", lowered):
            m = re.search(r"above\s*(\d{1,3})", lowered)
            if m:
                try:
                    t = int(m.group(1))
                    return {"type": "above", "threshold": max(0, min(100, t))}
                except:
                    return {"type": "total", "threshold": None}
            return {"type": "total", "threshold": None}
        # direct "how many above 75"
        m = re.search(r"how many .*above\s*(\d{1,3})", lowered)
        if m:
            try:
                t = int(m.group(1))
                return {"type": "above", "threshold": max(0, min(100, t))}
            except:
                return None
        return None

    def find_matching_job_for_user(self, user, message):
        """
        Try to find a job the current HR already created which matches tokens in message.
        Simple token matching — good enough for 'I created a job hr trainee before' cases.
        """
        jobs_qs = Job.objects.filter(hr=user)
        message_lower = (message or "").lower()
        for job in jobs_qs.order_by("-id"):
            title_lower = (job.title or "").lower()
            # tokens length >2 to avoid tiny words
            title_tokens = [t for t in re.split(r"\W+", title_lower) if len(t) > 2]
            if not title_tokens:
                continue
            matches = sum(1 for tk in title_tokens if tk in message_lower)
            if matches >= 1:
                return job
        return None

    def post(self, request):
        # --- PART A: resume uploads & evaluation ---
        resumes = request.FILES.getlist("resume")
        if not resumes and request.FILES.get("resume"):
            resumes = [request.FILES.get("resume")]

        if resumes:
            job_id = request.data.get("job_id")
            job = None
            if job_id:
                try:
                    job = Job.objects.get(id=job_id, hr=request.user)
                except Job.DoesNotExist:
                    return Response({"reply": "⚠️ Job not found or you are not authorized for this job."}, status=status.HTTP_404_NOT_FOUND)
            else:
                job = Job.objects.filter(hr=request.user).order_by("-id").first()

            if not job:
                return Response({"reply": "⚠️ Create a job first."}, status=status.HTTP_404_NOT_FOUND)

            model = genai.GenerativeModel("gemini-2.5-flash")
            results = []
            # import here to avoid circular imports at module top
            from candidates.models import CandidateResume
            from django.core.files.base import ContentFile

            for f in resumes:
                fname = f.name
                try:
                    if fname.lower().endswith(".pdf"):
                        text = pdf_to_text(f)
                    elif fname.lower().endswith(".txt"):
                        text = f.read().decode("utf-8", errors="ignore")
                    else:
                        results.append({"filename": fname, "error": "Unsupported file type"})
                        continue

                    if not text.strip():
                        results.append({"filename": fname, "error": "No readable text (scanned PDF maybe)."})
                        continue

                    text = truncate(text)

                    prompt = f"""
You are an expert HR evaluator. Compare the resume with this job and return ONLY JSON.

Job:
Title: {job.title}
Skills: {job.skills}
Experience: {job.experience_level}

Resume:
{text}

Return strictly this JSON:
{{
  "name": "",
  "email": "",
  "skills_found": [],
  "projects_found": [],
  "education": "",
  "score": 0,
  "strengths": [],
  "weaknesses": []
}}
"""
                    try:
                        response = model.generate_content(prompt)
                        ai_text = response.text if hasattr(response, "text") else str(response)
                    except Exception as e:
                        print("Gemini call error for", fname, e)
                        results.append({"filename": fname, "error": "AI service error"})
                        continue

                    data = extract_json(ai_text)
                    if not data:
                        results.append({"filename": fname, "error": "Invalid AI JSON"})
                        continue

                    # normalize score
                    score = data.get("score", 0)
                    try:
                        score = int(float(score))
                    except Exception:
                        score = 0
                    score = max(0, min(100, score))

                    strengths = data.get("strengths", [])
                    weaknesses = data.get("weaknesses", [])
                    if isinstance(strengths, str):
                        strengths = [s.strip() for s in re.split(r"\n|;|\.", strengths) if s.strip()]
                    if isinstance(weaknesses, str):
                        weaknesses = [s.strip() for s in re.split(r"\n|;|\.", weaknesses) if s.strip()]

                    unique_name = f"{uuid.uuid4()}_{fname}"
                    candidate = CandidateResume.objects.create(
                        job=job,
                        candidate_name=data.get("name") or "Unknown",
                        candidate_email=data.get("email") or "",
                        extracted_skills=data.get("skills_found", []),
                        projects_found=data.get("projects_found", []),
                        education=data.get("education", "") or "",
                        ai_score=score,
                        strengths=strengths,
                        weaknesses=weaknesses
                    )

                    # save file
                    f.seek(0)
                    candidate.resume.save(unique_name, ContentFile(f.read()))
                    candidate.save()

                    results.append({
                        "filename": fname,
                        "name": candidate.candidate_name,
                        "email": candidate.candidate_email,
                        "score": candidate.ai_score,
                    })

                except Exception as e:
                    print("Unexpected error processing", fname, e)
                    results.append({"filename": fname, "error": "Server error processing file."})

            return Response({"reply": f"Processed {len(results)} resume(s).", "results": results}, status=status.HTTP_200_OK)

        # --- PART B: chat / commands ---
        user_msg = (request.data.get("message") or "").strip()
        if not user_msg:
            return Response({"reply": "Please type a message."}, status=status.HTTP_400_BAD_REQUEST)

        lowered = user_msg.lower().strip()
        # Friendly greeting short-circuit
        if lowered in ("hi", "hello", "hey", "hi!", "hello!", "hey!"):
            return Response({
                "reply": "Hi! 👋 I'm here to help with job creation, resume evaluation and shortlisting. Tell me the role you'd like to add, ask me about an existing job, or say something like 'shortlist above 70' or 'how many candidates above 75'."
            }, status=status.HTTP_200_OK)

        # If user mentions they created a job before -> try to find it
        if re.search(r"\b(created|made|posted)\b.*\b(job|role)\b", user_msg, re.IGNORECASE) or re.search(r"\bbefore\b", user_msg, re.IGNORECASE):
            matched = self.find_matching_job_for_user(request.user, user_msg)
            if matched:
                return Response({
                    "reply": f"I found an existing job titled '{matched.title}'. Would you like to view candidates or upload resumes for this job? (If yes, I will use job_id={matched.id}.)",
                    "job": {
                        "id": matched.id,
                        "title": matched.title,
                        "salary_range": matched.salary_range,
                        "experience_level": matched.experience_level,
                        "job_type": matched.job_type,
                        "skills": matched.skills,
                        "description": matched.description,
                    }
                }, status=status.HTTP_200_OK)
            # else continue to normal flow

        # Detect count queries like "how many candidates" or "how many above 75"
        count_q = self.parse_count_command(user_msg)
        if count_q is not None:
            # choose job (from request.job_id or latest)
            job_id = request.data.get("job_id")
            job = None
            if job_id:
                try:
                    job = Job.objects.get(id=job_id, hr=request.user)
                except Job.DoesNotExist:
                    return Response({"reply": "I couldn't find that job (or it's not yours)."}, status=404)
            else:
                job = Job.objects.filter(hr=request.user).order_by("-id").first()
            if not job:
                return Response({"reply": "No job found. Create or specify a job first."}, status=404)

            from candidates.models import CandidateResume
            if count_q["type"] == "total":
                total = CandidateResume.objects.filter(job=job).count()
                return Response({"reply": f"There are {total} candidate(s) for '{job.title}'.", "count": total, "job_id": job.id}, status=200)
            elif count_q["type"] == "above":
                t = count_q["threshold"]
                total = CandidateResume.objects.filter(job=job, ai_score__gte=t).count()
                return Response({"reply": f"There are {total} candidate(s) with score ≥ {t} for '{job.title}'.", "count": total, "threshold": t, "job_id": job.id}, status=200)

        # Detect shortlist command (may be preview or apply)
        threshold, apply_shortlist = self.parse_shortlist_command(user_msg)
        if threshold is not None:
            job_id = request.data.get("job_id")
            job = None
            if job_id:
                try:
                    job = Job.objects.get(id=job_id, hr=request.user)
                except Job.DoesNotExist:
                    return Response({"reply": "I couldn't find that job (or you don't own it)."}, status=404)
            else:
                job = Job.objects.filter(hr=request.user).order_by("-id").first()
            if not job:
                return Response({"reply": "No job found to shortlist candidates for. Create or specify a job first."}, status=404)

            from candidates.models import CandidateResume
            qs = CandidateResume.objects.filter(job=job, ai_score__gte=threshold).order_by("-ai_score")
            shortlist_ids = [c.id for c in qs]

            # if user explicitly asked to apply (verbs like mark/set), update DB
            if apply_shortlist:
                updated = qs.update(shortlisted=True)
                return Response({
                    "reply": f"Marked {updated} candidate(s) as shortlisted for job '{job.title}' (score ≥ {threshold}).",
                    "shortlist_ids": shortlist_ids,
                    "job_id": job.id
                }, status=200)

            # else just preview / return ids
            return Response({
                "reply": f"I found {len(shortlist_ids)} candidate(s) with score ≥ {threshold} for job '{job.title}'. If you want I can mark them shortlisted — say 'mark shortlist above {threshold}'.",
                "shortlist_ids": shortlist_ids,
                "job_id": job.id
            }, status=200)

        # Normal job creation flow: append to conversation and ask model to extract fields
        self.conversation.append({"role": "user", "content": user_msg})
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"""
You extract job details from chat. Return ONLY JSON.

Return ONLY JSON in this format:
{{
  "job_title": "",
  "salary_range": "",
  "experience_level": "",
  "job_type": "",
  "skills": [],
  "description": ""
}}

Conversation:
{self.conversation}
"""
        try:
            response = model.generate_content(prompt)
            ai_text = response.text if hasattr(response, "text") else str(response)
        except Exception as e:
            print("Gemini Error:", e)
            return Response({"reply": "Sorry — I couldn't reach the AI service right now. Try again."}, status=status.HTTP_200_OK)

        data = extract_json(ai_text)
        if not data:
            return Response({
                "reply": "I couldn't extract structured job details from that. Please say e.g. 'Create a job for Full Stack Developer - Laravel, Fresher, 7 LPA, Full-time' or provide missing details when I ask."
            }, status=status.HTTP_200_OK)

        # check missing required fields
        missing = [f for f in self.REQUIRED_FIELDS if not data.get(f)]
        if missing:
            pretty = ", ".join(missing)
            human = f"Thanks — I have partial details. Could you please provide the missing info: {pretty}? (e.g. salary_range: '7 LPA', experience_level: 'Fresher', job_type: 'Full-time')"
            return Response({"reply": human, "need": missing}, status=status.HTTP_200_OK)

        # generate skills if too short
        if not data.get("skills") or len(data.get("skills", [])) < 4:
            skill_prompt = f"Suggest 8 skills for the job title: \"{data.get('job_title')}\". Return only a JSON array."
            try:
                sres = model.generate_content(skill_prompt)
                data["skills"] = self.clean_json_array(sres.text)
            except Exception:
                data["skills"] = []

        # generate single-paragraph description if missing
        if not data.get("description"):
            desc_prompt = f"""
Write a single natural 2–3 line description for: {data.get('job_title')}.
Do NOT include lists, options or numbering — only one short paragraph.
"""
            try:
                dres = model.generate_content(desc_prompt)
                desc_text = dres.text.strip().strip("```").strip()
                desc_text = " ".join(p.strip() for p in desc_text.splitlines() if p.strip())
                data["description"] = desc_text
            except Exception:
                data["description"] = ""

        # save job
        try:
            job = Job.objects.create(
                hr=request.user,
                title=data.get("job_title", ""),
                salary_range=data.get("salary_range", ""),
                experience_level=data.get("experience_level", ""),
                job_type=data.get("job_type", ""),
                skills=data.get("skills", []),
                description=data.get("description", "")
            )
            self.conversation.clear()
            return Response({
                "reply": f"✅ Job '{job.title}' created! You can now upload resumes for this job.",
                "data": data,
                "job_id": job.id
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            print("Job save error:", e)
            return Response({"reply": "⚠️ Error saving job."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# New endpoint: list jobs belonging to current HR
class JobsListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        jobs = Job.objects.filter(hr=request.user).order_by("-id")
        data = []
        for j in jobs:
            data.append({
                "id": j.id,
                "title": j.title,
                "description": j.description,
                "salary_range": j.salary_range,
                "experience_level": j.experience_level,
                "job_type": j.job_type,
                "skills": j.skills,
            })
        return Response({"jobs": data}, status=status.HTTP_200_OK)


# New endpoint: get candidates for a job (ordered desc by score)
class JobCandidatesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, hr=request.user)
        except Job.DoesNotExist:
            return Response({"reply": "⚠️ Job not found or not yours."}, status=status.HTTP_404_NOT_FOUND)

        from candidates.models import CandidateResume
        qs = CandidateResume.objects.filter(job=job).order_by("-ai_score", "-created_at")
        results = []

        for c in qs:
            resume_url = c.resume.url if c.resume else ""
            try:
                if resume_url:
                    resume_url = request.build_absolute_uri(resume_url)
            except Exception:
                pass

            # Ensure strengths/weaknesses are lists
            strengths = c.strengths if isinstance(c.strengths, list) else []
            weaknesses = c.weaknesses if isinstance(c.weaknesses, list) else []

            results.append({
                "id": c.id,
                "name": c.candidate_name or "N/A",
                "email": c.candidate_email or "N/A",
                "skills_found": c.extracted_skills or [],
                "projects_found": c.projects_found or [],
                "education": c.education or "N/A",
                "score": c.ai_score or 0,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "experience_level": c.job.experience_level or "N/A",
                "resume_url": resume_url,
                "created_at": c.created_at.isoformat(),
            })

        return Response({
            "job": {"id": job.id, "title": job.title, "experience_level": job.experience_level},
            "candidates": results
        }, status=status.HTTP_200_OK)


from .models import Job
from candidates.models import CandidateResume
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Job
from candidates.models import CandidateResume

class HRStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hr = request.user  # logged-in HR user

        # Jobs created by this HR
        jobs = Job.objects.filter(hr=hr)
        job_count = jobs.count()

        # Candidates of HR's jobs
        candidates = CandidateResume.objects.filter(job__hr=hr)
        total_candidates = candidates.count()

        # Shortlisted candidates
        shortlisted = candidates.filter(shortlisted=True).count()

        return Response({
            "jobs": job_count,
            "candidates": total_candidates,
            "shortlisted": shortlisted,
        })