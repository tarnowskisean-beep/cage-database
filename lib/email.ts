
import nodemailer from 'nodemailer';

// Use environment variables for SMTP, or fallback to console logging in dev
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.example.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || 'user';
const SMTP_PASS = process.env.SMTP_PASS || 'pass';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@compass.cpa';

// Create Transporter (Mock if noenv)
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

export async function sendWelcomeEmail(toEmail: string, token: string) {
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/setup-password?token=${token}`;

    // In development mode without credentials, just log it
    if (!process.env.SMTP_HOST) {
        console.log(`[MOCK EMAIL] To: ${toEmail}`);
        console.log(`[MOCK EMAIL] Subject: Welcome to Compass CPA`);
        console.log(`[MOCK EMAIL] Link: ${resetLink}`);
        return true;
    }

    try {
        await transporter.sendMail({
            from: `"Compass CPA" <${FROM_EMAIL}>`,
            to: toEmail,
            subject: 'Welcome to Compass CPA - Set your password',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Welcome to Compass CPA</h2>
                    <p>Your account has been created.</p>
                    <p>Please click the link below to set your secure password and access the system:</p>
                    <a href="${resetLink}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Set Password</a>
                    <p><small>This link expires in 24 hours.</small></p>
                </div>
            `,
        });
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
}
