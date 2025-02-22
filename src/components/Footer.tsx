import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-100 p-4 text-primary">
      <div className="container mx-auto text-center">
        <p>
          <Link href="https://topheman.github.io/me/" target="_blank">
            &copy; 2025 - Christophe Rosset
          </Link>
        </p>
      </div>
    </footer>
  );
}
