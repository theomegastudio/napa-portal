import nodemailer from 'nodemailer';

// Check if we should use console logging for emails (development)
const useConsoleEmail =
  process.env.EMAIL_CONSOLE === 'true' || !process.env.EMAIL_SERVER_HOST;

// Create transporter
const transporter = useConsoleEmail
  ? null
  : nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT || 587),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

const fromEmail = process.env.EMAIL_FROM || 'noreply@napahq.org';
const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface ApprovalRequestEmailData {
  adminEmail: string;
  adminName?: string | null;
  pendingUserEmail: string;
  pendingUserName?: string | null;
  organizationName: string;
  isFirstUser: boolean;
}

interface ApprovalNotificationEmailData {
  userEmail: string;
  userName?: string | null;
  approved: boolean;
  organizationName: string;
  rejectionReason?: string | null;
}

interface OTPEmailData {
  email: string;
  name?: string | null;
  otpCode: string;
}

/**
 * Send approval request email to an admin
 */
export async function sendApprovalRequestEmail(
  data: ApprovalRequestEmailData
): Promise<void> {
  const { adminEmail, adminName, pendingUserEmail, pendingUserName, organizationName, isFirstUser } = data;

  const subject = isFirstUser
    ? `New Organization Registration: ${organizationName}`
    : `New Member Pending Approval: ${pendingUserEmail}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New User Pending Approval</h2>

      <p>Hello${adminName ? ` ${adminName}` : ''},</p>

      <p>A new user is requesting access to NAPA Resource Hub:</p>

      <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Email:</strong> ${pendingUserEmail}</p>
        ${pendingUserName ? `<p style="margin: 4px 0;"><strong>Name:</strong> ${pendingUserName}</p>` : ''}
        <p style="margin: 4px 0;"><strong>Organization:</strong> ${organizationName}</p>
        ${isFirstUser ? '<p style="margin: 4px 0; color: #d97706;"><strong>Note:</strong> This is the first user from this organization.</p>' : ''}
      </div>

      <p>Please review this request and approve or reject the user:</p>

      <a href="${appUrl}/admin/approvals"
         style="display: inline-block; background-color: #eab308; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Review Pending Approvals
      </a>

      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        This email was sent from NAPA Resource Hub.
      </p>
    </div>
  `;

  if (useConsoleEmail) {
    console.log('\n' + '='.repeat(60));
    console.log('APPROVAL REQUEST EMAIL');
    console.log('='.repeat(60));
    console.log(`To: ${adminEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Pending User: ${pendingUserEmail}`);
    console.log(`Organization: ${organizationName}`);
    console.log(`Is First User: ${isFirstUser}`);
    console.log(`Review URL: ${appUrl}/admin/approvals`);
    console.log('='.repeat(60) + '\n');
    return;
  }

  await transporter?.sendMail({
    from: fromEmail,
    to: adminEmail,
    subject,
    html,
  });
}

/**
 * Send approval/rejection notification email to a user
 */
export async function sendApprovalNotificationEmail(
  data: ApprovalNotificationEmailData
): Promise<void> {
  const { userEmail, userName, approved, organizationName, rejectionReason } = data;

  const subject = approved
    ? 'Your NAPA Resource Hub Account Has Been Approved'
    : 'Your NAPA Resource Hub Account Request';

  const html = approved
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Account Approved!</h2>

        <p>Hello${userName ? ` ${userName}` : ''},</p>

        <p>Great news! Your request to join <strong>${organizationName}</strong> on NAPA Resource Hub has been approved.</p>

        <p>You can now sign in and access all resources:</p>

        <a href="${appUrl}/login"
           style="display: inline-block; background-color: #eab308; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Sign In Now
        </a>

        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          Welcome to the NAPA Resource Hub community!
        </p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Account Request Not Approved</h2>

        <p>Hello${userName ? ` ${userName}` : ''},</p>

        <p>Unfortunately, your request to join <strong>${organizationName}</strong> on NAPA Resource Hub was not approved.</p>

        ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}

        <p>If you believe this was a mistake or have questions, please contact the organization administrator.</p>

        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent from NAPA Resource Hub.
        </p>
      </div>
    `;

  if (useConsoleEmail) {
    console.log('\n' + '='.repeat(60));
    console.log(approved ? 'APPROVAL NOTIFICATION EMAIL' : 'REJECTION NOTIFICATION EMAIL');
    console.log('='.repeat(60));
    console.log(`To: ${userEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Status: ${approved ? 'APPROVED' : 'REJECTED'}`);
    console.log(`Organization: ${organizationName}`);
    if (!approved && rejectionReason) {
      console.log(`Reason: ${rejectionReason}`);
    }
    console.log('='.repeat(60) + '\n');
    return;
  }

  await transporter?.sendMail({
    from: fromEmail,
    to: userEmail,
    subject,
    html,
  });
}

/**
 * Send OTP verification email to a user
 */
export async function sendOTPEmail(data: OTPEmailData): Promise<void> {
  const { email, name, otpCode } = data;

  const subject = 'Your NAPA Resource Hub Verification Code';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 24px 0;">
        <h1 style="color: #F0A441; margin: 0;">NAPA Resource Hub</h1>
      </div>

      <h2 style="color: #333; text-align: center;">Verify Your Email</h2>

      <p style="text-align: center;">Hello${name ? ` ${name}` : ''},</p>

      <p style="text-align: center;">Use the following code to verify your email address:</p>

      <div style="background-color: #f5f5f5; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333; font-family: monospace;">
          ${otpCode}
        </span>
      </div>

      <p style="text-align: center; color: #666; font-size: 14px;">
        This code will expire in <strong>10 minutes</strong>.
      </p>

      <p style="text-align: center; color: #666; font-size: 14px;">
        If you didn't request this code, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

      <p style="color: #999; font-size: 12px; text-align: center;">
        This email was sent from NAPA Resource Hub.<br />
        Please do not reply to this email.
      </p>
    </div>
  `;

  if (useConsoleEmail) {
    console.log('\n' + '='.repeat(60));
    console.log('OTP VERIFICATION EMAIL');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log('Expires in: 10 minutes');
    console.log('='.repeat(60) + '\n');
    return;
  }

  await transporter?.sendMail({
    from: fromEmail,
    to: email,
    subject,
    html,
  });
}
