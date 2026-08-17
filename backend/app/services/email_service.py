import asyncio
import smtplib
from email.message import EmailMessage
from app.core.config import settings
from app.core.logging import logger


def _send_email_sync(msg: EmailMessage) -> bool:
    """Synchronous SMTP email dispatcher run in thread pool."""
    try:
        if settings.EMAIL_STARTTLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"SMTP email delivery error: {e}")
        return False


async def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    """
    Sends a password reset email via SMTP if configured.
    Respects strict production privacy logging rules:
    - Never logs raw tokens or complete reset URLs in production.
    - Logs reset link for developer convenience only in development/debug mode.
    """
    is_dev = settings.ENVIRONMENT == "development" or settings.DEBUG

    if not settings.SMTP_HOST:
        if is_dev:
            logger.info(
                f"[DEV MODE] Password reset requested for {to_email}. Reset URL: {reset_link}"
            )
        else:
            logger.warning(
                f"Password reset requested for {to_email}, but SMTP_HOST is not configured."
            )
        return True

    msg = EmailMessage()
    msg["From"] = settings.EMAILS_FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = f"Reset Your Password — {settings.PROJECT_NAME}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f0f; color: #e4e4e7; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 540px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
        .header {{ text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }}
        .logo {{ font-size: 20px; font-weight: bold; color: #f59e0b; text-decoration: none; }}
        .content {{ padding: 24px 0; text-align: left; line-height: 1.6; font-size: 14px; color: #d4d4d8; }}
        .button-wrap {{ text-align: center; margin: 28px 0; }}
        .btn {{ display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #09090b; font-weight: 700; font-size: 14px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3); }}
        .warning {{ font-size: 12px; color: #a1a1aa; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="#" class="logo">✨ {settings.PROJECT_NAME}</a>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset the password for your account (<strong>{to_email}</strong>).</p>
          <div class="button-wrap">
            <a href="{reset_link}" class="btn">Reset Password</a>
          </div>
          <p>This password reset link is valid for <strong>30 minutes</strong> and can only be used once.</p>
          <div class="warning">
            <p>If you did not request a password reset, you can safely ignore this email. Your account password will remain unchanged.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    """

    msg.set_content(
        f"Reset your password for {settings.PROJECT_NAME}:\n\n"
        f"Click the link below (valid for 30 minutes):\n{reset_link}\n\n"
        f"If you did not request a reset, you can ignore this message."
    )
    msg.add_alternative(html_content, subtype="html")

    try:
        success = await asyncio.to_thread(_send_email_sync, msg)
        if not success and is_dev:
            logger.info(f"[DEV FALLBACK] Reset Link: {reset_link}")
        return success
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        if is_dev:
            logger.info(f"[DEV FALLBACK] Reset Link: {reset_link}")
        return False
