import os
import resend
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

resend.api_key = os.getenv("RESEND_API_KEY")
RESEND_FROM    = os.getenv("RESEND_FROM",)
BASE_URL       = os.getenv("BASE_URL")
FRONTEND_URL   = os.getenv("FRONTEND_URL")


def _send(to: str, subject: str, html: str) -> None:
    params: resend.Emails.SendParams = {
        "from": RESEND_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    resend.Emails.send(params)
    logger.info(f"Email sent to {to} — subject: {subject}")


def send_verification_email(to: str, token: str) -> None:
    link = f"{BASE_URL}/auth/verify-email?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#1a1715">Verify your email</h2>
      <p style="color:#6b6460;line-height:1.6">
        Thanks for signing up. Click the button below to verify your email address.
        This link expires in <strong>24 hours</strong>.
      </p>
      <a href="{link}" style="display:inline-block;margin-top:24px;padding:12px 28px;
        background:#1a1715;color:#fff;border-radius:2px;text-decoration:none;
        font-size:14px;letter-spacing:0.05em">Verify Email</a>
      <p style="margin-top:24px;font-size:12px;color:#aaa">
        If you didn't create an account, you can ignore this email.
      </p>
    </div>
    """
    _send(to, "Verify your email — Hadeel Aljazeeraa Aljazeeraa", html)


def send_order_confirmation_email(to: str, order) -> None:
    items_html = "".join([
        f"""<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0ebe8;color:#1a1715;font-size:14px">
            Product #{item.product_id}
            {f'<span style="color:#aaa;font-size:12px"> · Size {item.size}</span>' if item.size else ''}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0ebe8;text-align:right;font-size:14px">
            × {item.quantity}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0ebe8;text-align:right;font-size:14px;font-weight:500">
            KWD {item.price_at_purchase * item.quantity:.3f}
          </td>
        </tr>"""
        for item in order.items
    ])

    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
      <h2 style="color:#1a1715;font-size:24px;font-weight:300;margin-bottom:8px">Order Confirmed</h2>
      <p style="color:#6b6460;font-size:14px;margin-bottom:24px">
        Thank you for your order! We'll get it ready for you soon.
      </p>

      <div style="background:#f5ede8;border-radius:4px;padding:16px;margin-bottom:24px">
        <div style="font-size:12px;color:#6b6460;margin-bottom:4px">Order Number</div>
        <div style="font-size:18px;font-weight:600;color:#1a1715">#{order.id}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        {items_html}
      </table>

      <div style="border-top:2px solid #1a1715;padding-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b6460;margin-bottom:6px">
          <span>Subtotal</span><span>KWD {order.subtotal:.3f}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b6460;margin-bottom:8px">
          <span>Shipping</span>
          <span>{'Free' if order.shipping == 0 else f'KWD {order.shipping:.3f}'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:600;color:#1a1715">
          <span>Total</span><span>KWD {order.total:.3f}</span>
        </div>
      </div>

      <div style="margin-top:24px;padding:16px;border:1px solid #ede5e0;border-radius:4px;font-size:13px;color:#6b6460">
        <div style="margin-bottom:4px"><strong style="color:#1a1715">Shipping to:</strong></div>
        <div>{order.shipping_address}</div>
        <div style="margin-top:4px">{order.phone}</div>
      </div>

      <p style="margin-top:24px;font-size:12px;color:#aaa">
        Payment: Cash on Delivery — we'll collect when we arrive.
      </p>

      <a href="{FRONTEND_URL}/account" style="display:inline-block;margin-top:20px;padding:10px 24px;
        background:#1a1715;color:#fff;border-radius:2px;text-decoration:none;font-size:13px">
        View Order
      </a>
    </div>
    """
    _send(to, f"Order #{order.id} Confirmed — Hadeel Aljazeeraa", html)


def send_order_shipped_email(to: str, order) -> None:
    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
      <h2 style="color:#1a1715;font-size:24px;font-weight:300;margin-bottom:8px">Your Order is On Its Way!</h2>
      <p style="color:#6b6460;font-size:14px;margin-bottom:24px">
        Great news — your order <strong style="color:#1a1715">#{order.id}</strong> has been shipped
        and is on its way to you.
      </p>

      <div style="background:#f5ede8;border-radius:4px;padding:16px;margin-bottom:24px">
        <div style="font-size:12px;color:#6b6460;margin-bottom:4px">Delivering to</div>
        <div style="font-size:14px;color:#1a1715">{order.shipping_address}</div>
        <div style="font-size:14px;color:#1a1715;margin-top:4px">{order.phone}</div>
      </div>

      <p style="font-size:13px;color:#6b6460">
        Payment of <strong style="color:#1a1715">KWD {order.total:.3f}</strong> will be
        collected on delivery.
      </p>

      <a href="{FRONTEND_URL}/account" style="display:inline-block;margin-top:24px;padding:10px 24px;
        background:#1a1715;color:#fff;border-radius:2px;text-decoration:none;font-size:13px">
        Track Order
      </a>

      <p style="margin-top:24px;font-size:12px;color:#aaa">
        Thank you for shopping with Hadeel Aljazeeraa.
      </p>
    </div>
    """
    _send(to, f"Order #{order.id} Shipped — Hadeel Aljazeeraa", html)


def send_password_reset_email(to: str, token: str) -> None:
    link = f"{FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#1a1715">Reset your password</h2>
      <p style="color:#6b6460;line-height:1.6">
        We received a request to reset your password. This link expires in <strong>1 hour</strong>.
      </p>
      <a href="{link}" style="display:inline-block;margin-top:24px;padding:12px 28px;
        background:#1a1715;color:#fff;border-radius:2px;text-decoration:none;font-size:14px">
        Reset Password</a>
      <p style="margin-top:24px;font-size:12px;color:#aaa">
        If you didn't request this, you can ignore this email.
      </p>
    </div>
    """
    _send(to, "Reset your password — Hadeel Aljazeeraa", html)