import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { query } from "@/lib/db"
import bcrypt from "bcryptjs"
import { authenticator } from 'otplib';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
                totp: { label: "2FA Code", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                try {
                    const res = await query(
                        'SELECT * FROM "Users" WHERE "Username" = $1',
                        [credentials.username]
                    );
                    const user = res.rows[0];

                    if (user) {
                        const validPassword = await bcrypt.compare(credentials.password, user.PasswordHash);
                        if (!validPassword) return null;

                        // 2FA Logic
                        if (user.TwoFactorEnabled) {
                            if (!credentials.totp) {
                                throw new Error('2FA_REQUIRED');
                            }

                            const isValid = authenticator.check(credentials.totp, user.TwoFactorSecret);
                            if (!isValid) {
                                throw new Error('INVALID_2FA');
                            }
                        }

                        return {
                            id: user.UserID.toString(),
                            name: user.Username,
                            email: user.Email,
                            role: user.Role
                        };
                    }
                } catch (e: any) {
                    // Pass specific 2FA errors through
                    if (e.message === '2FA_REQUIRED' || e.message === 'INVALID_2FA') {
                        throw e;
                    }
                    console.error(e);
                }
                return null;
            }
        })
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                (session.user as any).role = token.role;
            }
            return session;
        }
    },
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET || "supersecretkey" // Fallback for dev
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
