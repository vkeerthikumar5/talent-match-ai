from django.urls import path
from .views import HRRegisterView,LoginView,HRProfileView,UpdatePasswordView

urlpatterns = [
    path('register/hr/', HRRegisterView.as_view(), name='register-hr'),
    path('login/', LoginView.as_view(), name='login'),
    path("profile/", HRProfileView.as_view(), name="profile"),
    path('profile/update-password/', UpdatePasswordView.as_view()),
]
