import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { currency } from '../lib/format';
import EmptyState from '../components/EmptyState';
import PhotoUpload from '../components/PhotoUpload';
import ChatCompose from '../components/ChatCompose';
import type { CookTab } from '../data/types';
import type { ApiMyCookProfile, ApiOrderStatus } from '../data/api-types';

const TABS: CookTab[] = ['Overview', 'Orders', 'Messages', 'Menu', 'Customers', 'More'];
const CHAT_POLL_MS = 4000;
const CALENDAR_DAYS: Array<[string, string]> = [
  ['Tue', '22'],
  ['Wed', '23'],
  ['Thu', '24'],
  ['Fri', '25'],
  ['Sat', '26'],
  ['Sun', '27'],
];

// Decorative, out of scope for real wiring this phase (needs order-volume
// aggregation / reviews features that don't exist yet — see Cook Operations
// and Reviews in the roadmap).
function CookOverview() {
  const openModal = useAppStore((s) => s.openModal);
  const setCookTab = useAppStore((s) => s.setCookTab);
  const showToast = useAppStore((s) => s.showToast);
  const [activeDay, setActiveDay] = useState(CALENDAR_DAYS[0][0] + ' ' + CALENDAR_DAYS[0][1]);
  const [preparing, setPreparing] = useState<Set<number>>(new Set());

  const orders = [
    { time: '12:30', title: 'Priya & family · 3 boxes', note: 'Custom: less oil', action: 'Start prep' },
    { time: '1:00', title: 'Arun · 2 boxes', note: 'Customer favourite · medium spice', action: 'Start prep' },
    { time: '7:30', title: 'Oakley Studio · 18 boxes', note: 'Bulk team lunch · advance paid', action: 'Review' },
  ];

  return (
    <>
      <article className="alert-card">
        <span>◒</span>
        <div>
          <strong>Order cutoff in 48 min</strong>
          <p>Tomorrow’s lunch closes at 8:00 pm. You have 3 spots left.</p>
        </div>
      </article>
      <section className="stats">
        <article className="stat">
          <small>Today’s orders</small>
          <strong>12</strong>
          <span className="up">↑ 20% from last Tue</span>
        </article>
        <article className="stat">
          <small>Today’s earnings</small>
          <strong>₹2,340</strong>
          <span className="up">↑ ₹420 from last Tue</span>
        </article>
        <article className="stat">
          <small>Repeat customers</small>
          <strong>68%</strong>
          <span className="up">↑ 6% this month</span>
        </article>
        <article className="stat">
          <small>Next payout</small>
          <strong>₹8,460</strong>
          <span className="up">Friday, 24 Jul</span>
        </article>
      </section>
      <div className="section-head">
        <h2>Your order calendar</h2>
        <button onClick={() => openModal({ kind: 'cookTool', tool: 'calendar' })}>Full calendar</button>
      </div>
      <div className="calendar-strip">
        {CALENDAR_DAYS.map(([day, date]) => {
          const key = `${day} ${date}`;
          return (
            <button
              key={key}
              className={`calendar-day${activeDay === key ? ' active' : ''}`}
              onClick={() => {
                setActiveDay(key);
                showToast(`${key} selected in your order calendar`);
              }}
            >
              <small>{day}</small>
              <strong>{date}</strong>
            </button>
          );
        })}
      </div>
      <div className="section-head">
        <h2>To prepare today</h2>
        <button onClick={() => setCookTab('Orders')}>View all</button>
      </div>
      <section className="cart-card">
        {orders.map((order, i) => (
          <article className="cook-order" key={i}>
            <div className="time">{order.time}</div>
            <div>
              <h3>{order.title}</h3>
              <p>{order.note}</p>
            </div>
            <button
              onClick={() => {
                if (order.action === 'Review') return;
                setPreparing((s) => new Set(s).add(i));
                showToast('Customer has been updated');
              }}
            >
              {preparing.has(i) ? 'Preparing ✓' : order.action}
            </button>
          </article>
        ))}
      </section>
    </>
  );
}

const NEXT_STATUS: Partial<Record<ApiOrderStatus, ApiOrderStatus>> = {
  PLACED: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};
const NEXT_STATUS_LABEL: Partial<Record<ApiOrderStatus, string>> = {
  ACCEPTED: 'Accept order',
  PREPARING: 'Start preparing',
  OUT_FOR_DELIVERY: 'Mark out for delivery',
  DELIVERED: 'Mark delivered',
};
const CANCELLABLE_STATUSES: ApiOrderStatus[] = ['PLACED', 'ACCEPTED'];

function CookOrders() {
  const cookOrders = useAppStore((s) => s.cookOrders);
  const cookOrdersLoading = useAppStore((s) => s.cookOrdersLoading);
  const loadCookOrders = useAppStore((s) => s.loadCookOrders);
  const updateOrderStatus = useAppStore((s) => s.updateOrderStatus);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    loadCookOrders();
  }, [loadCookOrders]);

  const advance = async (orderId: string, status: ApiOrderStatus) => {
    const result = await updateOrderStatus(orderId, status, true);
    if (!result.ok) showToast(result.message);
  };

  return (
    <>
      <div className="section-head">
        <h2>All orders</h2>
      </div>
      {cookOrdersLoading && cookOrders.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading orders…</p>
      ) : cookOrders.length === 0 ? (
        <EmptyState icon="▣" title="No orders yet" body="Real orders from customers will show up here." />
      ) : (
        <section className="cart-card">
          {cookOrders.map((order) => {
            const next = order.status !== 'CANCELLED' && order.status !== 'DELIVERED' ? NEXT_STATUS[order.status] : undefined;
            return (
              <article className="cook-order" key={order.id}>
                <div>
                  <h3>{order.deliveryAddressLabel}</h3>
                  <p>
                    {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')} · {currency(order.totalPaise / 100)}
                  </p>
                  <p>{order.status.replace(/_/g, ' ')}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {CANCELLABLE_STATUSES.includes(order.status) && (
                    <button className="outline-button" onClick={() => advance(order.id, 'CANCELLED')}>
                      Cancel
                    </button>
                  )}
                  {next && <button onClick={() => advance(order.id, next)}>{NEXT_STATUS_LABEL[next]}</button>}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}

function CookMessages() {
  const conversations = useAppStore((s) => s.cookConversations);
  const conversationsLoading = useAppStore((s) => s.cookConversationsLoading);
  const loadCookConversations = useAppStore((s) => s.loadCookConversations);
  const thread = useAppStore((s) => s.cookThread);
  const threadLoading = useAppStore((s) => s.cookThreadLoading);
  const activeConversationCustomerId = useAppStore((s) => s.activeConversationCustomerId);
  const loadCookThread = useAppStore((s) => s.loadCookThread);
  const sendCookMessage = useAppStore((s) => s.sendCookMessage);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    loadCookConversations();
  }, [loadCookConversations]);

  useEffect(() => {
    if (!activeConversationCustomerId) return;
    const interval = setInterval(() => loadCookThread(activeConversationCustomerId), CHAT_POLL_MS);
    return () => clearInterval(interval);
  }, [activeConversationCustomerId, loadCookThread]);

  const closeConversation = () => useAppStore.setState({ activeConversationCustomerId: null, cookThread: [] });

  const send = async (text: string) => {
    if (!activeConversationCustomerId) return;
    const result = await sendCookMessage(activeConversationCustomerId, text);
    if (!result.ok) showToast(result.message);
  };

  if (activeConversationCustomerId) {
    const conversation = conversations.find((c) => c.customerId === activeConversationCustomerId);
    return (
      <>
        <div className="section-head">
          <button className="outline-button" onClick={closeConversation}>
            ← Back
          </button>
          <h2>{conversation?.customerName ?? 'Conversation'}</h2>
        </div>
        <div className="chat-list">
          {threadLoading && thread.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</p>
          ) : (
            thread.map((m) => (
              <div className={`bubble${m.senderRole === 'COOK' ? ' me' : ''}`} key={m.id}>
                {m.body}
              </div>
            ))
          )}
        </div>
        <ChatCompose placeholder="Write a reply" onSend={send} />
      </>
    );
  }

  return (
    <>
      <div className="section-head">
        <h2>Messages</h2>
      </div>
      {conversationsLoading && conversations.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</p>
      ) : conversations.length === 0 ? (
        <EmptyState icon="✦" title="No messages yet" body="Questions from customers will show up here." />
      ) : (
        <section className="cart-card">
          {conversations.map((c) => (
            <article
              className="cook-order"
              key={c.customerId}
              onClick={() => loadCookThread(c.customerId)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <h3>{c.customerName}</h3>
                <p>{c.lastMessage}</p>
              </div>
              {c.unreadCount > 0 && <span className="status">{c.unreadCount}</span>}
            </article>
          ))}
        </section>
      )}
    </>
  );
}

function CookMenu() {
  const myMenuItems = useAppStore((s) => s.myMenuItems);
  const myMenuLoading = useAppStore((s) => s.myMenuLoading);
  const loadMyMenu = useAppStore((s) => s.loadMyMenu);
  const createMenuItem = useAppStore((s) => s.createMenuItem);
  const updateMenuItem = useAppStore((s) => s.updateMenuItem);
  const deleteMenuItem = useAppStore((s) => s.deleteMenuItem);
  const showToast = useAppStore((s) => s.showToast);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMyMenu();
  }, [loadMyMenu]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPriceRupees('');
    setImageUrl('');
    setShowForm(false);
  };

  const submit = async () => {
    if (!name.trim() || !priceRupees) {
      showToast('Add a name and price');
      return;
    }
    setSubmitting(true);
    const result = await createMenuItem({
      name: name.trim(),
      description: description.trim() || undefined,
      pricePaise: Math.round(Number(priceRupees) * 100),
      imageUrl: imageUrl || undefined,
    });
    setSubmitting(false);
    showToast(result.message);
    if (result.ok) resetForm();
  };

  return (
    <>
      <div className="section-head">
        <h2>Your menu</h2>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Add food item'}</button>
      </div>
      {showForm && (
        <div className="seller-form">
          <label htmlFor="menu-item-name">Dish name</label>
          <input id="menu-item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lemon rice comfort box" />
          <label htmlFor="menu-item-description">Description (optional)</label>
          <input id="menu-item-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <label htmlFor="menu-item-price">Price (₹)</label>
          <input id="menu-item-price" type="number" min={0} value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)} />
          <label>Photo</label>
          {imageUrl ? (
            <img src={imageUrl} alt={name || 'New dish'} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
          ) : (
            <PhotoUpload label="Add a photo" onUploaded={setImageUrl} />
          )}
          <div className="modal-actions">
            <button className="primary-button" onClick={submit} disabled={submitting}>
              {submitting ? 'Adding…' : 'Add to menu'}
            </button>
          </div>
        </div>
      )}
      <section className="menu-manager">
        {myMenuLoading && myMenuItems.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</p>
        ) : myMenuItems.length ? (
          myMenuItems.map((item) => (
            <article className="menu-manager-row" key={item.id}>
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, marginRight: 8 }} />
              )}
              <div>
                <h3>{item.name}</h3>
                <p>
                  {currency(item.pricePaise / 100)} · {item.active ? 'Available today' : 'Hidden from customers'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={item.active ? 'follow-button' : 'outline-button'}
                  onClick={() => updateMenuItem(item.id, { active: !item.active })}
                >
                  {item.active ? 'Pause' : 'Enable'}
                </button>
                <button className="outline-button" onClick={() => deleteMenuItem(item.id)} aria-label={`Remove ${item.name}`}>
                  Remove
                </button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState icon="♨" title="List your first dish" body="Add a food item, price and photo to open your menu." />
        )}
      </section>
    </>
  );
}

// Decorative, out of scope this phase (needs reviews — not built yet).
function CookCustomers() {
  const openModal = useAppStore((s) => s.openModal);
  const showToast = useAppStore((s) => s.showToast);

  return (
    <>
      <div className="section-head">
        <h2>Your customers</h2>
        <button onClick={() => showToast('Customers are sorted by repeat order rate')}>Repeat first</button>
      </div>
      <section className="customer-list">
        <article>
          <span className="customer-avatar">P</span>
          <div>
            <h3>Priya S.</h3>
            <p>12 orders · 5-star regular</p>
          </div>
          <button onClick={() => openModal({ kind: 'customerMessage', name: 'Priya' })}>Message</button>
        </article>
        <article>
          <span className="customer-avatar">A</span>
          <div>
            <h3>Arun M.</h3>
            <p>8 orders · prefers medium spice</p>
          </div>
          <button onClick={() => openModal({ kind: 'customerMessage', name: 'Arun' })}>Message</button>
        </article>
      </section>
      <div className="section-head">
        <h2>Feedback inbox</h2>
      </div>
      <EmptyState icon="★" title="Reviews are coming soon" body="Customer reviews will appear here once that feature ships." />
    </>
  );
}

function CookMore({ cookProfile }: { cookProfile: ApiMyCookProfile }) {
  const openModal = useAppStore((s) => s.openModal);
  const navigate = useNavigate();

  return (
    <>
      <div className="section-head">
        <h2>Run your kitchen</h2>
      </div>
      <section className="settings-group">
        <button className="settings-row" onClick={() => openModal({ kind: 'payoutLedger' })}>
          <span>₹</span>
          <strong>Payout ledger</strong>
          <em>›</em>
        </button>
        <button className="settings-row" onClick={() => openModal({ kind: 'cookTool', tool: 'calendar' })}>
          <span>◷</span>
          <strong>Availability & cutoff</strong>
          <em>›</em>
        </button>
        <button className="settings-row" onClick={() => openModal({ kind: 'priceAssistant' })}>
          <span>✦</span>
          <strong>Pricing assistant</strong>
          <em>›</em>
        </button>
        <button className="settings-row" onClick={() => openModal({ kind: 'inventory' })}>
          <span>▤</span>
          <strong>Ingredient planning</strong>
          <em>›</em>
        </button>
        <button className="settings-row" onClick={() => navigate('/sell/register')}>
          <span>⌂</span>
          <strong>Edit {cookProfile.kitchenName}</strong>
          <em>›</em>
        </button>
      </section>
      <article className="payout-summary">
        <span>Next Friday payout</span>
        <strong>₹8,460</strong>
        <button onClick={() => openModal({ kind: 'payoutLedger' })}>Open ledger →</button>
      </article>
    </>
  );
}

export default function Cook() {
  const navigate = useNavigate();
  const auth = useAppStore((s) => s.auth);
  const cookProfile = useAppStore((s) => s.cookProfile);
  const cookProfileChecked = useAppStore((s) => s.cookProfileChecked);
  const loadCookStatus = useAppStore((s) => s.loadCookStatus);
  const showToast = useAppStore((s) => s.showToast);
  const cookTab = useAppStore((s) => s.cookTab);
  const setCookTab = useAppStore((s) => s.setCookTab);
  const cookConversations = useAppStore((s) => s.cookConversations);
  const loadCookConversations = useAppStore((s) => s.loadCookConversations);

  useEffect(() => {
    if (auth) {
      loadCookStatus();
      loadCookConversations();
    }
  }, [auth, loadCookStatus, loadCookConversations]);

  useEffect(() => {
    if (!auth) {
      showToast('This kitchen dashboard is only for verified cooks');
      navigate('/profile');
      return;
    }
    if (!cookProfileChecked) return;
    if (cookProfile?.verificationStatus !== 'VERIFIED') {
      showToast('This kitchen dashboard is only for verified cooks');
      navigate('/profile');
    }
  }, [auth, cookProfile, cookProfileChecked, navigate, showToast]);

  if (!cookProfile || cookProfile.verificationStatus !== 'VERIFIED') {
    return null;
  }

  const tabContent: Record<CookTab, ReactNode> = {
    Overview: <CookOverview />,
    Orders: <CookOrders />,
    Messages: <CookMessages />,
    Menu: <CookMenu />,
    Customers: <CookCustomers />,
    More: <CookMore cookProfile={cookProfile} />,
  };

  return (
    <>
      <div className="dashboard-greeting">
        <div>
          <p className="eyebrow">{cookProfile.kitchenName}</p>
          <h1>
            Good morning,
            <br />
            {cookProfile.ownerName}.
          </h1>
        </div>
        <button onClick={() => navigate('/')}>Customer view</button>
      </div>
      {tabContent[cookTab]}
      <div className="cook-bottom-nav">
        {TABS.map((tab) => {
          const unread = tab === 'Messages' ? cookConversations.reduce((sum, c) => sum + c.unreadCount, 0) : 0;
          return (
            <button key={tab} className={cookTab === tab ? 'active' : ''} onClick={() => setCookTab(tab)}>
              {tab}
              {tab === 'Messages' && <b className={unread > 0 ? 'show' : ''}>{unread}</b>}
            </button>
          );
        })}
      </div>
    </>
  );
}
