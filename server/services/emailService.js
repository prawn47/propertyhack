const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Send email verification
const sendVerificationEmail = async (email, verificationToken) => {
  try {
    const verificationUrl = `${process.env.CORS_ORIGIN}/verify-email?token=${verificationToken}`;
    
    const { data, error } = await resend.emails.send({
      from: `QUORD.ai <${process.env.RESEND_FROM_EMAIL || 'noreply@mail.quord.ai'}>`,
      to: [email],
      subject: 'Verify your QUORD.ai account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Welcome to QUORD.ai!</h1>
          <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't create an account with QUORD.ai, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send verification email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetUrl = `${process.env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
    
    const { data, error } = await resend.emails.send({
      from: `QUORD.ai <${process.env.RESEND_FROM_EMAIL || 'noreply@mail.quord.ai'}>`,
      to: [email],
      subject: 'Reset your QUORD.ai password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
          <p>You requested to reset your password for your QUORD.ai account. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send password reset email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};