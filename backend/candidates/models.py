# candidates/models.py
from django.db import models
from django.utils import timezone
from jobs.models import Job

def resume_upload_path(instance, filename):
    return f"candidates/job_{instance.job.id}/{filename}"

class CandidateResume(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="candidates")
    candidate_name = models.CharField(max_length=255, blank=True, null=True)
    candidate_email = models.EmailField(blank=True, null=True)
    extracted_skills = models.JSONField(default=list, blank=True)
    projects_found = models.JSONField(default=list, blank=True)
    education = models.TextField(blank=True)
    ai_score = models.IntegerField(default=0)
    strengths = models.JSONField(default=list, blank=True)
    weaknesses = models.JSONField(default=list, blank=True)

    shortlisted = models.BooleanField(default=False)   # ✅ New

    resume = models.FileField(upload_to=resume_upload_path, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.candidate_name or 'Unknown'} - Job {self.job.id}"
