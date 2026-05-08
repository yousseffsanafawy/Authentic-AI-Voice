export default function DocumentPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="min-h-screen bg-white p-8">
      <h1 className="text-xl font-bold mb-4 text-gray-800">
        Document: {params.id}
      </h1>
      <p className="text-gray-500">
        Sprint 1 — Tiptap editor will be built here.
      </p>
    </main>
  );
}
