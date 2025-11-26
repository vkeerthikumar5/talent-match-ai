from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import CandidateResume

class ToggleShortlistView(APIView):

    def post(self, request, id):
        try:
            candidate = CandidateResume.objects.get(id=id)
            candidate.shortlisted = request.data.get("shortlisted", False)
            candidate.save()

            return Response(
                {"success": True, "shortlisted": candidate.shortlisted},
                status=status.HTTP_200_OK
            )

        except CandidateResume.DoesNotExist:
            return Response(
                {"error": "Candidate not found"},
                status=status.HTTP_404_NOT_FOUND
            )

from rest_framework.views import APIView
from rest_framework.response import Response
from .models import CandidateResume
from .serializers import CandidateResumeSerializer
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

class CandidateListView(APIView):
    def get(self, request, job_id):
        candidates = CandidateResume.objects.filter(job_id=job_id)
        serializer = CandidateResumeSerializer(candidates, many=True, context={'request': request})
        return Response({"candidates": serializer.data})

# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import math

class SendBulkEmailView(APIView):
    """
    Accepts:
      - to (comma separated string)
      - cc (comma separated string)
      - bcc (comma separated string)
      - subject
      - message (plain-text)
      - attachments (multiple files)
    """

    def _parse_emails(self, csv):
        if not csv or csv.strip() == "":
            return [], []  # return empty valid + invalid

        emails = [e.strip() for e in csv.split(",") if e.strip()]
        valid = []
        invalid = []

        for e in emails:
            try:
                validate_email(e)
                valid.append(e)
            except ValidationError:
                invalid.append(e)

        return valid, invalid

    def post(self, request):
        to_raw = request.data.get("to", "")
        cc_raw = request.data.get("cc", "")
        bcc_raw = request.data.get("bcc", "")
        subject = request.data.get("subject", "").strip()
        message = request.data.get("message", "").strip()

        if not subject:
            return Response({"error": "Subject is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not message:
            return Response({"error": "Message is required"}, status=status.HTTP_400_BAD_REQUEST)

        to_list, invalid_to = self._parse_emails(to_raw)
        cc_list, invalid_cc = self._parse_emails(cc_raw)
        bcc_list, invalid_bcc = self._parse_emails(bcc_raw)

        invalid_all = invalid_to + invalid_cc + invalid_bcc
        if invalid_all:
            return Response(
                {"error": "Some emails are invalid", "invalid": invalid_all},
                status=status.HTTP_400_BAD_REQUEST
            )

        # render html body
        html_body = render_to_string("candidates/email_template.html", {"message": message})
        # Optional: strip tags for plain text
        from django.utils.html import strip_tags
        text_body = strip_tags(html_body) or message

        # Determine recipients for direct 'To' sending. 
        recipients = to_list[:]  # copy

        # If sending to very many recipients, send in batches so SMTP servers don't choke
        BATCH_SIZE = 50  # tweak for your provider; smaller for free providers
        all_recipients = recipients.copy()

        # We use a single connection to send multiple messages efficiently
        connection = get_connection(fail_silently=False)

        sent_count = 0
        errors = []

        try:
            # Create attachments list from uploaded files
            attachments = []
            for f in request.FILES.getlist("attachments"):
                attachments.append((f.name, f.read(), f.content_type))

            # send in batches
            for i in range(0, len(all_recipients), BATCH_SIZE):
                batch = all_recipients[i:i+BATCH_SIZE] or []
                if not batch:
                    # if no 'to' recipients, still allow cc/bcc-only case
                    batch_recipients = cc_list + bcc_list
                else:
                    batch_recipients = batch

                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_body,
                    from_email=None,  # will use DEFAULT_FROM_EMAIL
                    to=batch_recipients,
                    cc=cc_list if batch else cc_list,
                    bcc=bcc_list if batch else bcc_list,
                    connection=connection
                )
                email.attach_alternative(html_body, "text/html")
                for name, content, mime in attachments:
                    email.attach(name, content, mime)
                email.send()
                sent_count += len(batch_recipients)
        except Exception as e:
            errors.append(str(e))

        if errors:
            return Response({"success": False, "sent": sent_count, "errors": errors}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"success": True, "sent": sent_count})
