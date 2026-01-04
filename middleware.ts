import { withAuth } from "next-auth/middleware"

export default withAuth({
    pages: {
        signIn: "/login",
    },
})

// Protect everything by default, including /api
// Explicitly exclude public assets, login, and public API sub-paths if needed
export const config = { matcher: ["/((?!api/auth|api/webhooks|api/batches|login|debug-env|fix-schema|debug-full|_next/static|_next/image|favicon.ico).*)"] }
