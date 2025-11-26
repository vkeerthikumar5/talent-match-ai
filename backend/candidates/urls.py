from .views import ToggleShortlistView,CandidateListView,SendBulkEmailView
from django.urls import path
urlpatterns = [
path("shortlist/<int:id>/", ToggleShortlistView.as_view()),
path('job/<int:job_id>/', CandidateListView.as_view(), name='candidate-list'),
path("send-email/", SendBulkEmailView.as_view()),

]
