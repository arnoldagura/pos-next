/**
 * Email service for sending invitations and notifications
 *
 * TODO: Integrate with actual email provider:
 * - Resend (resend.com) - Recommended
 * - SendGrid
 * - AWS SES
 * - Mailgun
 */

export interface SendInvitationEmailParams {
  to: string;
  name?: string;
  organizationName: string;
  invitationUrl: string;
  expiresInDays: number;
}

/**
 * Send invitation email to new user
 */
export async function sendInvitationEmail({
  to,
  name,
  organizationName,
  invitationUrl,
  expiresInDays,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Replace with actual email service integration
    // For now, just log the email content
    console.log('📧 INVITATION EMAIL (Demo Mode)');
    console.log('================================');
    console.log(`To: ${to}`);
    console.log(`Subject: You're invited to join ${organizationName}`);
    console.log('');
    console.log('Email Content:');
    console.log(`Hi ${name || 'there'},`);
    console.log('');
    console.log(
      `You've been invited to join ${organizationName} as an administrator.`
    );
    console.log('');
    console.log(
      'Click the link below to accept your invitation and set up your account:'
    );
    console.log(invitationUrl);
    console.log('');
    console.log(`This invitation will expire in ${expiresInDays} days.`);
    console.log('');
    console.log(
      'If you have any questions, please contact your administrator.'
    );
    console.log('================================');

    // TODO: Actual email sending implementation
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@yourdomain.com',
    //   to,
    //   subject: `You're invited to join ${organizationName}`,
    //   html: getInvitationEmailTemplate({ name, organizationName, invitationUrl, expiresInDays }),
    // });
    console.log(
      getInvitationEmailTemplate({
        name,
        organizationName,
        invitationUrl,
        expiresInDays,
      })
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * HTML email template for invitation
 */
function getInvitationEmailTemplate({
  name,
  organizationName,
  invitationUrl,
  expiresInDays,
}: {
  name?: string;
  organizationName: string;
  invitationUrl: string;
  expiresInDays: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to ${organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
  </div>

  <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name || 'there'},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      You've been invited to join <strong>${organizationName}</strong> as an administrator.
    </p>

    <p style="font-size: 16px; margin-bottom: 30px;">
      Click the button below to accept your invitation and set up your account:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This invitation will expire in ${expiresInDays} days.
    </p>

    <p style="font-size: 14px; color: #6b7280;">
      If you have any questions, please contact your administrator.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `.trim();
}
