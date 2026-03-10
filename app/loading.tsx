export default function RootLoading() {
  return (
    <main className="mx-auto mt-10 max-w-3xl px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    </main>
  );
}
