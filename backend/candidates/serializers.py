from rest_framework import serializers
from .models import CandidateResume

class CandidateResumeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='candidate_name', read_only=True)
    email = serializers.CharField(source='candidate_email', read_only=True)
    resume_url = serializers.SerializerMethodField()
    score = serializers.IntegerField(source='ai_score')
    experience_level = serializers.CharField(source='job.experience_level', read_only=True)

    class Meta:
        model = CandidateResume
        fields = [
            "id",
            "name",
            "email",
            "extracted_skills",
            "projects_found",
            "education",
            "score",
            "strengths",
            "weaknesses",
            "experience_level",
            "shortlisted",
            "resume_url",
            "created_at",
        ]


    def get_resume_url(self, obj):
        request = self.context.get("request")
        if obj.resume:
            return request.build_absolute_uri(obj.resume.url) if request else obj.resume.url
        return None
