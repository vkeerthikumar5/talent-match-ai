# jobs/urls.py
from django.urls import path
from .views import JobChatAPIView, JobsListAPIView, JobCandidatesAPIView,HRStatsView

urlpatterns = [
    path("chat/", JobChatAPIView.as_view(), name="chat_with_ai"),
    path("list/", JobsListAPIView.as_view(), name="jobs_list"),
    path("<int:job_id>/candidates/", JobCandidatesAPIView.as_view(), name="job_candidates"),
    path("stats/", HRStatsView.as_view(), name="hr-stats"),
]
