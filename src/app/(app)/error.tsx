"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Something went wrong
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        {error.message ?? "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
