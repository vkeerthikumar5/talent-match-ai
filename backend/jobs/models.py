# jobs/models.py
from django.db import models
from accounts.models import HRUser

class Job(models.Model):
    hr = models.ForeignKey(HRUser, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=255)
    salary_range = models.CharField(max_length=100)
    experience_level = models.CharField(max_length=100)
    job_type = models.CharField(max_length=50)
    skills = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.title} - {self.hr.full_name}"

