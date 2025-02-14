import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-100 p-4 text-primary">
      <div className="container mx-auto text-center">
        <p>&copy; 2025 - Christophe Rosset</p>
        <div className="mt-2 space-x-4">
          <Link
            href="https://github.com/topheman"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </Link>
          <Link
            href="https://www.linkedin.com/in/topheman/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </Link>
          <Link
            href="https://twitter.com/topheman"
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter
          </Link>
        </div>
      </div>
    </footer>
  );
}
