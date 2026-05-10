export const seedDocuments = [
  {
    id: "seed-1",
    title: "Project Proposal (Seed)",
    word_count: 125,
    updated_at: new Date().toISOString(),
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Project Proposal" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "This is a seed document loaded because the backend is disconnected." }],
        },
      ],
    },
    content_text: "Project Proposal\nThis is a seed document loaded because the backend is disconnected.",
  },
  {
    id: "seed-2",
    title: "Meeting Notes (Seed)",
    word_count: 50,
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Meeting Notes" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Discussed the implementation of seed data." }],
        },
      ],
    },
    content_text: "Meeting Notes\nDiscussed the implementation of seed data.",
  },
  {
    id: "seed-3",
    title: "Blog Draft (Seed)",
    word_count: 200,
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Writing a blog post about offline-first architectures." }],
        },
      ],
    },
    content_text: "Writing a blog post about offline-first architectures.",
  },
];
