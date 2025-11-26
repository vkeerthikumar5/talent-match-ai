from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import HRRegisterSerializer,PasswordUpdateSerializer
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

class HRRegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = HRRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "HR registered successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        user = authenticate(request, username=email, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "email": user.email,
                "message": "Login successful",
            }, status=200)
        else:
            return Response({"error": "Invalid credentials"}, status=401)

# views.py

from rest_framework.permissions import IsAuthenticated
from .serializers import HRProfileSerializer

class HRProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = HRProfileSerializer(request.user)
        return Response(serializer.data, status=200)

    def put(self, request):
        serializer = HRProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profile updated successfully!"}, status=200)
        return Response(serializer.errors, status=400)


class UpdatePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = PasswordUpdateSerializer(data=request.data)
        if serializer.is_valid():
            old_password = serializer.validated_data["old_password"]
            new_password = serializer.validated_data["new_password"]

            user = request.user
            if not user.check_password(old_password):
                return Response({"error": "Incorrect old password"}, status=400)

            user.set_password(new_password)
            user.save()
            return Response({"message": "Password updated successfully!"}, status=200)

        return Response(serializer.errors, status=400)

