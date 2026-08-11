import { useAppStore } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import ModalHeader from '../components/ModalHeader';
import EmptyState from '../components/EmptyState';

export default function PlanCookPickerModal() {
  const kitchens = useKitchens();
  const planDraft = useAppStore((s) => s.planDraft);
  const setPlanCookId = useAppStore((s) => s.setPlanCookId);
  const openModal = useAppStore((s) => s.openModal);
  const showToast = useAppStore((s) => s.showToast);

  const summary = planDraft.days.length ? planDraft.days.join(', ') : 'No days selected yet';

  const pick = (cookId: string, name: string) => {
    setPlanCookId(cookId);
    openModal({ kind: 'plan' });
    showToast(`${name} selected for your tiffin plan`);
  };

  return (
    <>
      <ModalHeader eyebrow={summary} title="Find a cook for your plan" />
      {kitchens.length ? (
        <div className="favourite-list">
          {kitchens.map((k) => (
            <button className="favourite-row" key={k.id} onClick={() => pick(k.id, k.name)}>
              <img src={k.avatar} alt={k.cook} loading="lazy" />
              <span>
                <strong>{k.name}</strong>
                <small>
                  {k.cuisine} · {k.distance}
                </small>
              </span>
              <em>{k.id === planDraft.cookId ? '✓' : '›'}</em>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon="☼" title="No kitchens available yet" body="Check back once a verified kitchen joins LOOM." />
      )}
    </>
  );
}
