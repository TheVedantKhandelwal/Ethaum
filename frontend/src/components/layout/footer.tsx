import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            LaunchDeck — AI-powered SaaS marketplace
          </p>
          <div className="flex gap-6">
            <Link href="/launches" className="text-sm text-gray-500 hover:text-gray-900">
              Launches
            </Link>
            <Link href="/compare" className="text-sm text-gray-500 hover:text-gray-900">
              Compare
            </Link>
            <Link href="/insights" className="text-sm text-gray-500 hover:text-gray-900">
              Insights
            </Link>
            <Link href="/deals" className="text-sm text-gray-500 hover:text-gray-900">
              Deals
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
