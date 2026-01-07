import { withAuth } from "next-auth/middleware"

export default withAuth({
    pages: {
        signIn: "/login",
    },
})

// Protect everything by default, including /api
// Explicitly exclude public assets, login, and public API sub-paths if needed
export const config = { matcher: ["/((?!api/auth|api/webhooks|api/batches|api/save-donation|login|debug-env|debug-full|api/seed|_next/static|_next/image|favicon.ico).*)"] }
