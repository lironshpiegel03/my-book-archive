import { useEffect, useMemo, useState } from "react";

/* Your MockAPI base + prefix + resource name */
const API_URL = "https://698861e1780e8375a6882998.mockapi.io/api/v1/books";

export default function App() {
  const hasApi = !!API_URL;

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(hasApi);

  // UI state
  const [q, setQ] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Delete confirm state
  const [confirmId, setConfirmId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    author: "",
    coverImage: "",
    description: "",
    rating: 0,
  });

  /* Shows a toast for a short time */
  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  };

  const resetForm = () =>
    setForm({ title: "", author: "", coverImage: "", description: "", rating: 0 });

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (book) => {
    setEditing(book);
    setForm({
      title: book.title || "",
      author: book.author || "",
      coverImage: book.coverImage || "",
      description: book.description || "",
      rating: Number(book.rating || 0),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  /* --- API helpers --- */
  const apiGet = async () => {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("GET failed");
    return res.json();
  };

  const apiPost = async (data) => {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("POST failed");
    return res.json();
  };

  const apiPut = async (id, data) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("PUT failed");
    return res.json();
  };

  const apiDel = async (id) => {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("DELETE failed");
  };

  /* Initial load */
  useEffect(() => {
    (async () => {
      if (!hasApi) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiGet();
        setBooks(Array.isArray(data) ? data : []);
      } catch {
        showToast("❌ Cannot load books. Check your API URL.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Filter list by search + favorites */
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return books
      .filter((b) => (onlyFav ? !!b.isFavorite : true))
      .filter((b) => (query ? (b.title || "").toLowerCase().includes(query) : true));
  }, [books, q, onlyFav]);

  /* Save (create or update) */
  const saveBook = async () => {
    if (!form.title.trim() || !form.author.trim()) {
      showToast("Please fill Title and Author", "error");
      return;
    }

    const ratingNum = Math.max(0, Math.min(5, Number(form.rating || 0)));

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      coverImage: form.coverImage.trim() || "https://picsum.photos/400/520",
      description: form.description.trim(),
      rating: ratingNum,
    };

    try {
      if (editing) {
        const updated = await apiPut(editing.id, { ...editing, ...payload });
        setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        showToast("✅ Book updated");
      } else {
        const created = await apiPost({
          ...payload,
          isFavorite: false, // Default favorite is enforced by the client
        });
        setBooks((prev) => [...prev, created]);
        showToast("✅ Book added");
      }
      closeModal();
      resetForm();
    } catch {
      showToast("❌ Save failed. Check API / network.", "error");
    }
  };

  /* Toggle favorite */
  const toggleFav = async (book) => {
    try {
      const updated = await apiPut(book.id, { ...book, isFavorite: !book.isFavorite });
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      showToast(updated.isFavorite ? "❤️ Added to favorites" : "🤍 Removed from favorites", "info");
    } catch {
      showToast("❌ Failed to update favorite", "error");
    }
  };

  const askDelete = (id) => setConfirmId(id);

  const doDelete = async () => {
    const id = confirmId;
    if (!id) return;
    try {
      await apiDel(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      showToast("🗑️ Book deleted");
    } catch {
      showToast("❌ Delete failed", "error");
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div style={S.page}>
      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />

      <div style={S.container}>
        <header style={S.header}>
          <div>
            <div style={S.badgesRow}>
              <span style={S.badge}>📚 pastel library · by Leeron Spiegel</span>
              <span style={S.badgeSoft}>{books.length} total</span>
              <span style={S.badgeSoft}>{books.filter((b) => b.isFavorite).length} favorites</span>
            </div>

            <h1 style={S.h1}>
              <span style={S.h1Script}>My Book Archive</span>
            </h1>

            <p style={S.sub}>CRUD app (React) • Add / Edit / Delete • Favorites • Search</p>
          </div>

          <button style={S.primaryBtn} onClick={openCreate}>
            + Add Book
          </button>
        </header>

        <section style={S.toolbar}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>

            <input
              style={S.searchInput}
              placeholder="Search by title..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            {q && (
              <button type="button" style={S.clearBtn} onClick={() => setQ("")} aria-label="Clear">
                ✕
              </button>
            )}
          </div>

          <button
            style={{ ...S.chip, ...(onlyFav ? S.chipActive : null) }}
            onClick={() => setOnlyFav((v) => !v)}
          >
            {onlyFav ? "Showing Favorites" : "Show Favorites"}
          </button>
        </section>

        {loading ? (
          <div style={S.centerBox}>
            <div style={S.loader} />
            <span style={{ color: "#475569" }}>Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={S.emptyCard}>
            <div style={S.emptyIcon}>✨</div>
            <h2 style={S.emptyTitle}>No books found</h2>
            <p style={S.emptyText}>
              {onlyFav ? "No favorites yet. Add some hearts ♥" : "Try adding a book or changing the search."}
            </p>
            <button style={S.primaryBtn} onClick={openCreate}>
              + Add Book
            </button>
          </div>
        ) : (
          <div style={S.grid} data-gridfix="true">
            {filtered.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                onFav={() => toggleFav(b)}
                onEdit={() => openEdit(b)}
                onDelete={() => askDelete(b.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal onClose={closeModal}>
          <div style={S.modalTitleRow}>
            <h3 style={S.modalTitle}>{editing ? "Edit Book" : "Add Book"}</h3>
            <button style={S.iconBtn} onClick={closeModal} aria-label="close">
              ✕
            </button>
          </div>

          <div style={S.formGrid}>
            <Field label="Title *">
              <input
                style={S.input}
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. The Silent Patient"
              />
            </Field>

            <Field label="Author *">
              <input
                style={S.input}
                value={form.author}
                onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                placeholder="e.g. Alex Michaelides"
              />
            </Field>

            <Field label="Cover Image URL">
              <input
                style={S.input}
                value={form.coverImage}
                onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))}
                placeholder="https://... (or leave empty)"
              />
              <div style={S.hint}>Tip: leave empty for a random image.</div>
            </Field>

            <Field label="Rating">
              <StarRating
                value={Number(form.rating || 0)}
                onChange={(v) => setForm((p) => ({ ...p, rating: v }))}
              />
            </Field>

            <Field label="Description">
              <textarea
                style={S.textarea}
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short summary..."
              />
            </Field>
          </div>

          <div style={S.modalFooter}>
            <button style={S.secondaryBtn} onClick={closeModal}>
              Cancel
            </button>
            <button style={S.primaryBtn} onClick={saveBook}>
              {editing ? "Save Changes" : "Add Book"}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmId && (
        <Modal onClose={() => setConfirmId(null)}>
          <div style={S.modalTitleRow}>
            <h3 style={S.modalTitle}>Delete book?</h3>
            <button style={S.iconBtn} onClick={() => setConfirmId(null)} aria-label="close">
              ✕
            </button>
          </div>
          <p style={{ color: "#475569", margin: "8px 0 18px" }}>
            Are you sure you want to delete this book? This action cannot be undone.
          </p>
          <div style={S.modalFooter}>
            <button style={S.secondaryBtn} onClick={() => setConfirmId(null)}>
              Cancel
            </button>
            <button style={S.dangerBtn} onClick={doDelete}>
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Components ---------- */

function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{label}</div>
      {children}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={S.overlay} onMouseDown={onClose}>
      <div style={S.modal} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function StarRating({ value, onChange }) {
  const v = Math.max(0, Math.min(5, Number(value || 0)));

  return (
    <div style={S.ratingBox}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {Array.from({ length: 5 }).map((_, i) => {
          const star = i + 1;
          const active = star <= v;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              style={{ ...S.starBtn, ...(active ? S.starBtnOn : null) }}
              aria-label={`rate ${star}`}
              title={`Rate ${star}`}
            >
              ★
            </button>
          );
        })}

        <button type="button" style={S.clearRatingBtn} onClick={() => onChange(0)} title="Clear">
          Clear
        </button>
      </div>
      <div style={S.ratingHint}>{v === 0 ? "No rating" : `${v}/5`}</div>
    </div>
  );
}

function BookCard({ book, onFav, onEdit, onDelete }) {
  const cover = book.coverImage || "https://picsum.photos/400/520";
  const rating = Math.max(0, Math.min(5, Number(book.rating || 0)));

  return (
    <div style={S.card}>
      <div style={S.cardTopGradient} />
      <div style={S.cardInner}>
        <div style={S.coverWrap}>
          <img src={cover} alt={book.title} style={S.cover} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.cardHeaderRow}>
            <div style={{ minWidth: 0 }}>
              <div style={S.cardTitle} title={book.title}>
                {book.title}
              </div>
              <div style={S.cardAuthor} title={book.author}>
                {book.author}
              </div>
            </div>

            <button style={S.heartBtn} onClick={onFav} aria-label="favorite">
              <span style={{ fontSize: 18, color: book.isFavorite ? "#f43f5e" : "#94a3b8" }}>
                ♥
              </span>
            </button>
          </div>

          <div style={S.cardRatingRow}>
            <div style={S.starsLine} aria-label={`rating ${rating}`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ color: i < rating ? "#f59e0b" : "#cbd5e1" }}>
                  ★
                </span>
              ))}
            </div>
            <span style={S.ratingPill}>{rating === 0 ? "No rating" : `${rating}/5`}</span>
          </div>

          <div style={S.cardDesc}>
            {book.description ? (
              book.description
            ) : (
              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No description</span>
            )}
          </div>

          <div style={S.cardActions}>
            <span style={book.isFavorite ? S.favPill : S.pill}>
              {book.isFavorite ? "Favorite" : "Book"}
            </span>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button style={S.smallBtn} onClick={onEdit}>
                Edit
              </button>
              <button style={S.smallDangerBtn} onClick={onDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast.show) return null;

  const bg =
    toast.type === "success" ? "#DCFCE7" : toast.type === "error" ? "#FFE4E6" : "#E0F2FE";
  const fg =
    toast.type === "success" ? "#166534" : toast.type === "error" ? "#9F1239" : "#075985";

  return (
    <div style={S.toastWrap}>
      <div style={{ ...S.toast, background: "rgba(255,255,255,0.85)" }}>
        <div style={{ ...S.toastIcon, background: bg, color: fg }}>
          {toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "i"}
        </div>
        <div style={{ color: "#334155", fontWeight: 700 }}>{toast.msg}</div>
        <button style={S.iconBtn} onClick={onClose} aria-label="close toast">
          ✕
        </button>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #fff7ed 0%, #fdf2f8 30%, #eff6ff 65%, #ecfdf5 100%)",
    padding: 34,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
  },
  container: { maxWidth: 1100, margin: "0 auto" },

  header: {
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
    flexWrap: "wrap",
  },

  badgesRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  badge: {
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(255,255,255,0.8)",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 900,
    color: "#0f172a",
    boxShadow: "0 10px 25px rgba(15,23,42,0.06)",
  },
  badgeSoft: {
    background: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.75)",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 800,
    color: "#334155",
  },

  h1: { margin: "10px 0 6px" },
  h1Script: {
    fontSize: 62,
    color: "#0f172a",
    letterSpacing: -1,
    fontWeight: 900,
    fontFamily:
      '"Brush Script MT","Segoe Script","Snell Roundhand","Apple Chancery","Comic Sans MS",cursive',
  },

  sub: { margin: 0, color: "#475569", fontSize: 16 },

  primaryBtn: {
    border: "none",
    borderRadius: 16,
    padding: "12px 16px",
    cursor: "pointer",
    background: "linear-gradient(90deg, #fb7185 0%, #f472b6 55%, #a78bfa 100%)",
    color: "white",
    fontWeight: 900,
    boxShadow: "0 14px 35px rgba(244,114,182,0.25)",
  },
  secondaryBtn: {
    border: "1px solid rgba(148,163,184,0.35)",
    borderRadius: 16,
    padding: "12px 16px",
    cursor: "pointer",
    background: "rgba(255,255,255,0.75)",
    color: "#0f172a",
    fontWeight: 900,
  },
  dangerBtn: {
    border: "none",
    borderRadius: 16,
    padding: "12px 16px",
    cursor: "pointer",
    background: "linear-gradient(90deg, #fb7185 0%, #ef4444 100%)",
    color: "white",
    fontWeight: 900,
  },

  toolbar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    padding: 14,
    borderRadius: 22,
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
    marginBottom: 18,
  },

  searchWrap: {
    flex: 1,
    minWidth: 260,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(226,232,240,0.9)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
  },
  searchIcon: { fontSize: 16, opacity: 0.7 },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 15,
    color: "#0f172a",
  },
  clearBtn: {
    border: "none",
    cursor: "pointer",
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "rgba(241,245,249,0.9)",
    color: "#475569",
    fontWeight: 900,
  },

  chip: {
    borderRadius: 999,
    padding: "10px 14px",
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontWeight: 900,
    color: "#0f172a",
  },
  chipActive: {
    background: "linear-gradient(90deg, rgba(251,113,133,0.25), rgba(167,139,250,0.25))",
    border: "1px solid rgba(167,139,250,0.35)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
  },

  centerBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 22,
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(255,255,255,0.8)",
    width: "fit-content",
  },
  loader: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "3px solid rgba(148,163,184,0.35)",
    borderTopColor: "#a78bfa",
    animation: "spin 1s linear infinite",
  },

  emptyCard: {
    padding: 26,
    borderRadius: 26,
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
    textAlign: "center",
    maxWidth: 520,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    margin: "0 auto 10px",
    background:
      "linear-gradient(135deg, rgba(251,113,133,0.25), rgba(96,165,250,0.25), rgba(52,211,153,0.25))",
    boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
    fontSize: 22,
  },
  emptyTitle: { margin: "8px 0 6px", fontSize: 22, fontWeight: 1000, color: "#0f172a" },
  emptyText: { margin: "0 0 14px", color: "#475569" },

  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 26,
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(255,255,255,0.85)",
    boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
  },
  cardTopGradient: {
    position: "absolute",
    inset: 0,
    height: 92,
    background:
      "linear-gradient(90deg, rgba(251,113,133,0.25), rgba(96,165,250,0.25), rgba(52,211,153,0.25))",
  },
  cardInner: { position: "relative", display: "flex", gap: 14, padding: 14 },

  coverWrap: {
    width: 86,
    height: 124,
    borderRadius: 20,
    overflow: "hidden",
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
    flexShrink: 0,
  },
  cover: { width: "100%", height: "100%", objectFit: "cover" },

  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 1000,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardAuthor: {
    fontSize: 13,
    fontWeight: 800,
    color: "#475569",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  cardRatingRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 8 },
  starsLine: { display: "flex", gap: 2, fontSize: 14, lineHeight: "14px" },
  ratingPill: {
    fontSize: 12,
    fontWeight: 900,
    color: "#334155",
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(255,255,255,0.85)",
    padding: "4px 10px",
    borderRadius: 999,
  },

  heartBtn: {
    border: "1px solid rgba(255,255,255,0.85)",
    background: "rgba(255,255,255,0.75)",
    width: 36,
    height: 36,
    borderRadius: 999,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
  },

  cardDesc: {
    marginTop: 10,
    fontSize: 13,
    color: "#334155",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    minHeight: 34,
  },

  cardActions: { marginTop: 12, display: "flex", alignItems: "center", gap: 10 },
  pill: {
    fontSize: 12,
    fontWeight: 900,
    color: "#334155",
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(255,255,255,0.85)",
    padding: "6px 10px",
    borderRadius: 999,
  },
  favPill: {
    fontSize: 12,
    fontWeight: 900,
    color: "#9f1239",
    background: "rgba(255,228,230,0.7)",
    border: "1px solid rgba(251,113,133,0.35)",
    padding: "6px 10px",
    borderRadius: 999,
  },
  smallBtn: {
    borderRadius: 12,
    padding: "8px 10px",
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    fontWeight: 900,
    color: "#0f172a",
  },
  smallDangerBtn: {
    borderRadius: 12,
    padding: "8px 10px",
    border: "1px solid rgba(251,113,133,0.35)",
    background: "rgba(255,228,230,0.7)",
    cursor: "pointer",
    fontWeight: 900,
    color: "#9f1239",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.35)",
    backdropFilter: "blur(6px)",
    display: "grid",
    placeItems: "center",
    padding: 18,
    zIndex: 50,
  },
  modal: {
    width: "min(620px, 100%)",
    borderRadius: 26,
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
    padding: 16,
  },
  modalTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 1000, color: "#0f172a" },
  iconBtn: {
    border: "none",
    background: "rgba(255,255,255,0.75)",
    borderRadius: 12,
    width: 36,
    height: 36,
    cursor: "pointer",
    fontWeight: 900,
    boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
  },

  formGrid: { display: "grid", gap: 12, marginTop: 14 },
  input: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(255,255,255,0.95)",
    padding: "12px 12px",
    outline: "none",
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(255,255,255,0.95)",
    padding: "12px 12px",
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  },
  hint: { marginTop: 6, fontSize: 12, color: "#64748b" },

  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 },

  toastWrap: { position: "fixed", top: 16, right: 16, zIndex: 60 },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.85)",
    boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 1000,
  },

  ratingBox: {
    borderRadius: 16,
    padding: 12,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(255,255,255,0.8)",
  },
  starBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: "18px",
    fontWeight: 900,
    color: "#94a3b8",
  },
  starBtnOn: {
    color: "#f59e0b",
    border: "1px solid rgba(245,158,11,0.35)",
    background: "rgba(254,243,199,0.9)",
  },
  clearRatingBtn: {
    marginLeft: 6,
    height: 40,
    padding: "0 12px",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(241,245,249,0.8)",
    cursor: "pointer",
    fontWeight: 900,
    color: "#475569",
  },
  ratingHint: { marginTop: 8, fontSize: 12, color: "#64748b", fontWeight: 800 },
};

/* Inject minimal CSS for spinner + responsive grid */
const __style = document.createElement("style");
__style.innerHTML = `
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 980px) { .__gridfix { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .__gridfix { grid-template-columns: repeat(1, minmax(0, 1fr)); } }
`;
document.head.appendChild(__style);

/* Apply responsive class to the grid via a global selector */
const __gridFixObserver = new MutationObserver(() => {
  const grids = document.querySelectorAll("[data-gridfix='true']");
  grids.forEach((g) => g.classList.add("__gridfix"));
});
__gridFixObserver.observe(document.documentElement, { childList: true, subtree: true });
