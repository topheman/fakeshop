import { getUserSession } from "../lib/session"
import FakeLogin from "../components/FakeLogin"
import { handleFakeLogin } from "./actions/auth"

export default async function Home() {
  const session = await getUserSession()
  console.log("Home page - Session:", session ? "exists" : "null")

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-primary mb-4">Welcome to FakeStore</h1>
      <p className="mb-4">
        FakeStore is a demo e-commerce website built with Next.js 15, showcasing modern web development practices. It's
        designed to demonstrate the power of React Server Components, streaming, and progressive enhancement.
      </p>
      <p className="mb-8">
        This project is open-source and serves as an educational resource for developers interested in building
        high-performance, scalable web applications using the latest technologies.
      </p>
      <div className="text-center">
        <FakeLogin login={handleFakeLogin} initialSession={session} />
      </div>
    </div>
  )
}

