import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';
import EmptyState from '../components/EmptyState';

export default function StoriesModal() {
  const stories = useAppStore((s) => s.stories);
  const storiesLoading = useAppStore((s) => s.storiesLoading);
  const loadStories = useAppStore((s) => s.loadStories);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  return (
    <>
      <ModalHeader eyebrow="From our cooks" title="Stories from the stove" />
      {storiesLoading && stories.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</p>
      ) : stories.length ? (
        <div className="story-feed">
          {stories.map((story) => (
            <article key={story.id}>
              <div>
                <h3>{story.title}</h3>
                <p>{story.body}</p>
                {story.kitchenName && (
                  <p style={{ color: 'var(--muted)', fontSize: 10, marginTop: 4 }}>{story.kitchenName}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon="✎" title="No stories yet" body="Check back soon — cooks will be able to share their stories here." />
      )}
    </>
  );
}
