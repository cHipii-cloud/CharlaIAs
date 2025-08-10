import React, { useEffect, useState } from "react";

const COLUMN_IDS = [
  { id: "ideas", title: "Ideas" },
  { id: "dev", title: "En desarrollo" },
  { id: "pause", title: "En pausa" },
  { id: "done", title: "Cerradas" },
];

const STORAGE_KEY = "charlaboard_v1";

function classifyText(text) {
  const t = (text || "").toLowerCase();
  const tags = new Set();
  let suggestedColumn = "ideas";

  const mapping = [
    ["diseñ", ["Diseño", "branding"], "dev"],
    ["ia", ["IA", "machine learning"], "dev"],
    ["video", ["Video", "reel"], "dev"],
    ["idea", ["Idea"], "ideas"],
    ["chocolate", ["ChocoBoo"], "ideas"],
    ["negocio", ["Negocios"], "dev"],
    ["recordatorio", ["Recordatorio"], "pause"],
    ["cerrar", ["Cerrada"], "done"],
    ["deadline", ["Urgente"], "dev"],
    ["spotify", ["Música"], "ideas"],
    ["humor", ["Humor"], "ideas"],
  ];

  mapping.forEach(([kw, tgs, col]) => {
    if (t.includes(kw)) {
      tgs.forEach((tg) => tags.add(tg));
      suggestedColumn = col;
    }
  });

  if (text && text.length > 250 && suggestedColumn === "ideas") suggestedColumn = "dev";

  return { tags: Array.from(tags), suggestedColumn };
}

function summarizeText(text, maxChars = 160) {
  if (!text) return "";
  const endIdx = text.indexOf(". ");
  if (endIdx !== -1 && endIdx < maxChars) return text.slice(0, endIdx + 1);
  return text.length <= maxChars ? text : text.slice(0, maxChars - 1) + "…";
}

export default function App() {
  const [cards, setCards] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [autoClassify, setAutoClassify] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setCards(JSON.parse(raw));
    else {
      const seed = [
        {
          id: Date.now() - 1000,
          title: "Propuesta ChocoBoo",
          content: "Post para Instagram sobre ChocoBoo. Quiero destacar que soy diseñador y mostrar skills.",
          summary: "Post IG sobre ChocoBoo enfocando mis skills como diseñador.",
          tags: ["ChocoBoo", "Diseño"],
          column: "ideas",
          date: new Date().toISOString(),
        },
      ];
      setCards(seed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  const allTags = Array.from(new Set(cards.flatMap((c) => c.tags || [])));

  function createCard({ title, content }) {
    const id = Date.now();
    const base = {
      id,
      title: title || summarizeText(content, 40),
      content,
      summary: summarizeText(content),
      tags: [],
      column: "ideas",
      date: new Date().toISOString(),
    };

    const { tags, suggestedColumn } = classifyText(content);
    base.tags = tags;
    base.column = autoClassify ? suggestedColumn : base.column;

    setCards((s) => [base, ...s]);
  }

  function updateCard(updated) {
    setCards((s) => s.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  }

  function deleteCard(id) {
    setCards((s) => s.filter((c) => c.id !== id));
  }

  function moveCardTo(id, column) {
    updateCard({ id, column });
  }

  function onDragStart(e, cardId) {
    e.dataTransfer.setData("text/plain", String(cardId));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropToColumn(e, columnId) {
    const cardId = Number(e.dataTransfer.getData("text/plain"));
    moveCardTo(cardId, columnId);
    e.preventDefault();
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  function filteredCardsForColumn(columnId) {
    return cards.filter((c) => c.column === columnId && matchesFilters(c));
  }

  function matchesFilters(card) {
    if (query) {
      const q = query.toLowerCase();
      if (!(card.title.toLowerCase().includes(q) || card.content.toLowerCase().includes(q) || (card.tags || []).join(" ").toLowerCase().includes(q))) return false;
    }
    if (activeTags.length) {
      if (!activeTags.every((t) => (card.tags || []).includes(t))) return false;
    }
    return true;
  }

  function toggleTag(t) {
    setActiveTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "charlas_export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          setCards(data.concat(cards));
        } else alert("Archivo JSON inválido: se espera un array de charlas.");
      } catch (err) {
        alert("Error leyendo JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">CharlaBoard — Organizador de charlas</h1>
        <div className="flex gap-2 items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por texto o tag..."
            className="px-3 py-2 rounded border w-60"
          />
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setShowAdd(true)}>
            + Nueva charla
          </button>
        </div>
      </header>

      <section className="mb-4 flex gap-3 items-center">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={autoClassify} onChange={(e) => setAutoClassify(e.target.checked)} />
          Auto-clasificar
        </label>

        <div className="flex gap-2 items-center">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={`px-2 py-1 rounded text-sm border ${activeTags.includes(t) ? "bg-gray-800 text-white" : "bg-white"}`}
            >
              #{t}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={exportJSON} className="px-2 py-1 border rounded">Exportar</button>
          <label className="px-2 py-1 border rounded cursor-pointer">
            Importar
            <input type="file" accept="application/json" className="hidden" onChange={(e) => importJSON(e.target.files[0])} />
          </label>
        </div>
      </section>

      <main className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMN_IDS.map((col) => (
          <div key={col.id} className="bg-white rounded shadow p-3 min-h-[200px]">
            <h2 className="font-semibold mb-2">{col.title} <span className="text-xs text-gray-500">({filteredCardsForColumn(col.id).length})</span></h2>
            <div
              onDragOver={onDragOver}
              onDrop={(e) => onDropToColumn(e, col.id)}
              className="space-y-2 min-h-[120px]"
            >
              {filteredCardsForColumn(col.id).map((card) => (
                <article
                  key={card.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, card.id)}
                  className="p-3 border rounded bg-gray-50 cursor-grab"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{card.title}</h3>
                      <p className="text-xs text-gray-600">{card.summary}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{new Date(card.date).toLocaleDateString()}</p>
                      <div className="flex gap-1 mt-2">
                        {(card.tags || []).map((tg) => (
                          <span key={tg} className="text-xs px-2 py-0.5 rounded bg-white border">{tg}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setShowAdd(true);
                      }}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="px-2 py-1 border rounded text-sm text-red-600"
                    >
                      Delete
                    </button>
                    <div className="ml-auto flex gap-1">
                      {COLUMN_IDS.filter((c) => c.id !== card.column).map((c) => (
                        <button key={c.id} onClick={() => moveCardTo(card.id, c.id)} className="px-2 py-1 border rounded text-sm">
                          → {c.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </main>

      {showAdd && (
        <AddEditModal
          initial={editingCard}
          onClose={() => {
            setShowAdd(false);
            setEditingCard(null);
          }}
          onSave={({ id, title, content }) => {
            if (id) {
              const { tags } = classifyText(content);
              updateCard({ id, title, content, summary: summarizeText(content), tags });
            } else {
              createCard({ title, content });
            }
            setShowAdd(false);
            setEditingCard(null);
          }}
        />
      )}
    </div>
  );
}

function AddEditModal({ initial, onClose, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");

  useEffect(() => {
    setTitle(initial?.title || "");
    setContent(initial?.content || "");
  }, [initial]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded shadow p-4 w-full max-w-2xl">
        <h3 className="font-semibold mb-2">{initial ? "Editar charla" : "Nueva charla"}</h3>
        <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full border rounded px-3 py-2 h-40" placeholder="Pega acá la charla, ideas o fragmentos..." value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="mt-3 flex gap-2 justify-end">
          <button className="px-3 py-1 border rounded" onClick={onClose}>Cancelar</button>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded"
            onClick={() => onSave({ id: initial?.id, title: title.trim(), content: content.trim() })}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}