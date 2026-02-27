export async function sendPasswordResetEmail(email, resetUrl, tenantName) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[Email] No RESEND_API_KEY — reset URL for ${email}: ${resetUrl}`);
    return;
  }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Desktop Kitchen <noreply@desktop.kitchen>',
        to: [email],
        subject: 'Reset your password — Desktop Kitchen',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#0d9488">Reset Your Password</h2>
            <p>We received a request to reset the password for <strong>${tenantName}</strong>.</p>
            <p style="margin:24px 0">
              <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a>
            </p>
            <p style="color:#666;font-size:14px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('[Email] Failed to send password reset email:', err.message);
  }
}

export async function sendWelcomeEmail(email, restaurantName, subdomain, pin) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[Email] No RESEND_API_KEY — welcome email for ${email} skipped`);
    return;
  }
  const loginUrl = subdomain
    ? `https://${subdomain}.desktop.kitchen`
    : 'https://pos.desktop.kitchen';
  const docsUrl = 'https://docs.desktop.kitchen';
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Desktop Kitchen <noreply@desktop.kitchen>',
        to: [email],
        subject: `Welcome to Desktop Kitchen — ${restaurantName}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px">
            <h2 style="color:#0d9488;margin-bottom:4px">Welcome to Desktop Kitchen!</h2>
            <p style="color:#666;margin-top:0">Your POS system for <strong>${restaurantName}</strong> is ready.</p>

            <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0 0 8px"><strong>Your Admin PIN:</strong> <span style="font-size:20px;font-weight:700;letter-spacing:4px">${pin}</span></p>
              <p style="margin:0"><strong>Login:</strong> <a href="${loginUrl}" style="color:#0d9488">${loginUrl.replace('https://', '')}</a></p>
            </div>

            <h3 style="color:#0d9488;margin-bottom:8px">Getting Started</h3>
            <ol style="color:#374151;line-height:1.8;padding-left:20px">
              <li>Log in with your PIN above</li>
              <li>Set up your menu categories and items</li>
              <li>Add employees and assign roles</li>
              <li>Configure payment methods</li>
              <li>Start taking orders!</li>
            </ol>

            <p style="margin-top:20px">
              <a href="${docsUrl}" style="display:inline-block;padding:10px 20px;background:#0d9488;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">View Setup Guide</a>
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#9ca3af;font-size:13px">Need help? Visit <a href="${docsUrl}" style="color:#0d9488">docs.desktop.kitchen</a> or reply to this email.</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('[Email] Failed to send welcome email:', err.message);
  }
}

export async function sendPinEmail(email, pin, restaurantName, subdomain) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[Email] No RESEND_API_KEY — PIN for ${email}: ${pin}`);
    return;
  }
  const loginUrl = subdomain
    ? `https://${subdomain}.desktop.kitchen`
    : 'https://pos.desktop.kitchen';
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Desktop Kitchen <noreply@desktop.kitchen>',
        to: [email],
        subject: `Your POS Login PIN — ${restaurantName}`,
        html: `<h2>Welcome to Desktop Kitchen!</h2><p>Your admin PIN: <strong style="font-size:24px">${pin}</strong></p><p>Log in at <a href="${loginUrl}">${loginUrl.replace('https://', '')}</a></p>`,
      }),
    });
  } catch (err) {
    console.error('[Email] Failed to send PIN email:', err.message);
  }
}
