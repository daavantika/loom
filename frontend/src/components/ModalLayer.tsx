import { useAppStore } from '../store/appStore';
import FiltersModal from '../modals/FiltersModal';
import ReviewModal from '../modals/ReviewModal';
import ReviewListModal from '../modals/ReviewListModal';
import CookProfileModal from '../modals/CookProfileModal';
import AssistantModal from '../modals/AssistantModal';
import ChatModal from '../modals/ChatModal';
import LocationModal from '../modals/LocationModal';
import PayoutLedgerModal from '../modals/PayoutLedgerModal';
import PriceAssistantModal from '../modals/PriceAssistantModal';
import InventoryModal from '../modals/InventoryModal';
import CustomerMessageModal from '../modals/CustomerMessageModal';
import StoriesModal from '../modals/StoriesModal';
import PlanModal from '../modals/PlanModal';
import PlanCookPickerModal from '../modals/PlanCookPickerModal';
import TodaySpecialsModal from '../modals/TodaySpecialsModal';
import FestivalFoodsModal from '../modals/FestivalFoodsModal';
import CateringModal from '../modals/CateringModal';
import CookToolModal from '../modals/CookToolModal';
import TrackingModal from '../modals/TrackingModal';
import CheckoutModal from '../modals/CheckoutModal';
import FavouritesModal from '../modals/FavouritesModal';
import MyReviewsModal from '../modals/MyReviewsModal';
import PreferencesModal from '../modals/PreferencesModal';
import PaymentsModal from '../modals/PaymentsModal';
import AccountModal from '../modals/AccountModal';
import AuthModal from '../modals/AuthModal';

export default function ModalLayer() {
  const modal = useAppStore((s) => s.modal);
  const closeModal = useAppStore((s) => s.closeModal);

  const content = (() => {
    if (!modal) return null;
    switch (modal.kind) {
      case 'filters':
        return <FiltersModal />;
      case 'review':
        return <ReviewModal cookId={modal.cookId} />;
      case 'reviewList':
        return <ReviewListModal cookId={modal.cookId} />;
      case 'cook':
        return <CookProfileModal cookId={modal.cookId} />;
      case 'assistant':
        return <AssistantModal />;
      case 'chat':
        return <ChatModal cookId={modal.cookId} />;
      case 'location':
        return <LocationModal />;
      case 'payoutLedger':
        return <PayoutLedgerModal />;
      case 'priceAssistant':
        return <PriceAssistantModal />;
      case 'inventory':
        return <InventoryModal />;
      case 'customerMessage':
        return <CustomerMessageModal name={modal.name} />;
      case 'stories':
        return <StoriesModal />;
      case 'plan':
        return <PlanModal />;
      case 'planCookPicker':
        return <PlanCookPickerModal />;
      case 'todaySpecials':
        return <TodaySpecialsModal />;
      case 'festivalFoods':
        return <FestivalFoodsModal />;
      case 'catering':
        return <CateringModal />;
      case 'cookTool':
        return <CookToolModal tool={modal.tool} />;
      case 'tracking':
        return <TrackingModal orderId={modal.orderId} />;
      case 'checkout':
        return <CheckoutModal />;
      case 'favourites':
        return <FavouritesModal />;
      case 'myReviews':
        return <MyReviewsModal />;
      case 'preferences':
        return <PreferencesModal />;
      case 'payments':
        return <PaymentsModal />;
      case 'account':
        return <AccountModal />;
      case 'auth':
        return <AuthModal mode={modal.mode} />;
      default:
        return null;
    }
  })();

  return (
    <div
      className={`modal-layer${modal ? ' visible' : ''}`}
      aria-live="polite"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      {modal && <section className="modal">{content}</section>}
    </div>
  );
}
