import { foodImages } from '../data/kitchens';
import ModalHeader from '../components/ModalHeader';

const STORIES = [
  { image: foodImages.story, alt: 'Freshly prepared dessert', title: 'Why I still hand-grind my masalas', body: 'Meera on flavour, patience and recipes that travel through families.' },
  { image: foodImages.dosa, alt: 'Tiffin meal', title: 'A tiffin ritual from Pollachi', body: 'A quiet breakfast tradition built for busy weekday mornings.' },
  { image: foodImages.sweets, alt: 'Festival sweets', title: 'My grandmother’s Diwali murukku', body: 'Anitha shares the first batch she makes every festival season.' },
];

export default function StoriesModal() {
  return (
    <>
      <ModalHeader eyebrow="From our cooks" title="Stories from the stove" />
      <div className="story-feed">
        {STORIES.map((story) => (
          <article key={story.title}>
            <img src={story.image} alt={story.alt} loading="lazy" />
            <div>
              <h3>{story.title}</h3>
              <p>{story.body}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
