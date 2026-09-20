# GreatLife EmailJS template

The application sends all variables used by `booking-status.html` for pending,
approved, rejected, cancelled, and paid booking emails. The admin's **Resend
Status Email** action also uses this same template and automatically selects the
booking's current status, including paid bookings.

## Install in EmailJS

1. Open EmailJS **Email Templates** and select `template_wtb8cmf`.
2. Set **To Email** to `{{to_email}}`.
3. Set **From Name** to `GreatLife Fitness`.
4. Set **Subject** to `{{email_subject}}`.
5. In **Content**, open the HTML source editor (`<>`) and replace the current
   content with everything in `booking-status.html`.
6. Open the template's **Attachments** tab and upload both static assets:
   - `frontend/public/images/logo.png` as `greatlife-logo.png`
   - `backend/email-templates/greatlife-mark.png` as `greatlife-mark.png`
7. Keep the generated EmailJS HTTPS attachment URLs in the HTML. The header
   uses `greatlife-logo.png`, while the large glass panel uses
   `greatlife-mark.png`.
8. Set **Reply-To** to the GreatLife business email address, then save the
   template and use **Test It**.

Do not replace either image URL with a localhost URL; recipients cannot access
files served from the development computer.
