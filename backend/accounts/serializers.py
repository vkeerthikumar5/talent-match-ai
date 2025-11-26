from rest_framework import serializers
from .models import HRUser

class HRRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = HRUser
        fields = ['full_name', 'email', 'password', 'organization_name', 'contact_number']

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = HRUser.objects.create_user(password=password, **validated_data)
        return user


class HRProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HRUser
        fields = ['full_name', 'email', 'organization_name', 'contact_number']
        read_only_fields = ['email']  # Email should not be editable


class PasswordUpdateSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField()