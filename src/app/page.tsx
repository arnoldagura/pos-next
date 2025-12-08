export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome to POS System
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A modern point-of-sale system for managing your business operations
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
