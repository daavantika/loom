import { Routes, Route } from 'react-router-dom';
import App from './App';
import Home from './views/Home';
import Explore from './views/Explore';
import Cart from './views/Cart';
import Orders from './views/Orders';
import Profile from './views/Profile';
import Cook from './views/Cook';
import Admin from './views/Admin';
import SellerRegistration from './views/SellerRegistration';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="cart" element={<Cart />} />
        <Route path="orders" element={<Orders />} />
        <Route path="profile" element={<Profile />} />
        <Route path="sell/register" element={<SellerRegistration />} />
        <Route path="cook" element={<Cook />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}
