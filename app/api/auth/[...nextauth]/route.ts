import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { query } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
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
                        // Check if password looks hashed (bcrypt starts with $2)
                        // If the seed data is plain text 'hashedpassword', we might need to handle legacy or update it.
                        // For now, assume we will update DB to valid hash.
                        const valid = await bcrypt.compare(credentials.password, user.PasswordHash);
                        if (valid) {
                            return {
                                id: user.UserID.toString(),
                                name: user.Username,
                                email: user.Email,
                                role: user.Role
                            };
                        }
                    }
                } catch (e) {
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
