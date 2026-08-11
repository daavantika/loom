import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';
import EmptyState from '../components/EmptyState';

export default function CookStoriesModal() {
  const myStories = useAppStore((s) => s.myStories);
  const myStoriesLoading = useAppStore((s) => s.myStoriesLoading);
  const loadMyStories = useAppStore((s) => s.loadMyStories);
  const createStory = useAppStore((s) => s.createStory);
  const deleteStory = useAppStore((s) => s.deleteStory);
  const showToast = useAppStore((s) => s.showToast);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMyStories();
  }, [loadMyStories]);

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      showToast('Add a title and a few words');
      return;
    }
    setSubmitting(true);
    const result = await createStory({ title: title.trim(), body: body.trim() });
    setSubmitting(false);
    showToast(result.message);
    if (result.ok) {
      setTitle('');
      setBody('');
    }
  };

  return (
    <>
      <ModalHeader eyebrow="From your kitchen" title="Stories from the stove" />
      <div className="seller-form">
        <label htmlFor="story-title">Title</label>
        <input id="story-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Why I still hand-grind my masalas" />
        <label htmlFor="story-body">Story</label>
        <textarea id="story-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        <div className="modal-actions">
          <button className="primary-button" onClick={submit} disabled={submitting}>
            {submitting ? 'Sharing…' : 'Share story'}
          </button>
        </div>
      </div>

      <div className="section-head">
        <h2>Your stories</h2>
      </div>
      <section className="menu-manager">
        {myStoriesLoading && myStories.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</p>
        ) : myStories.length ? (
          myStories.map((story) => (
            <article className="menu-manager-row" key={story.id}>
              <div>
                <h3>{story.title}</h3>
                <p>{story.body}</p>
              </div>
              <button className="outline-button" onClick={() => deleteStory(story.id)} aria-label={`Remove ${story.title}`}>
                Remove
              </button>
            </article>
          ))
        ) : (
          <EmptyState icon="✎" title="No stories yet" body="Share what makes your kitchen yours — customers will see it in Stories from the stove." />
        )}
      </section>
    </>
  );
}
