import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/user.entity';
import { CookProfile } from '../cooks/cook-profile.entity';
import { KitchenPhoto } from '../cooks/kitchen-photo.entity';
import { CustomerProfile } from '../customers/customer-profile.entity';
import { CustomerAddress } from '../customers/customer-address.entity';
import { CustomerFavorite } from '../customers/customer-favorite.entity';
import { MenuItem } from '../menu/menu-item.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { OrderStatusEvent } from '../orders/order-status-event.entity';
import { Message } from '../messages/message.entity';
import { DeliveryBooking } from '../delivery/delivery-booking.entity';
import { Story } from '../stories/story.entity';

dotenv.config();

export const UserDataSource = new DataSource({
  type: 'postgres',
  url: process.env.USER_DATABASE_URL,
  entities: [
    User,
    CookProfile,
    KitchenPhoto,
    CustomerProfile,
    CustomerAddress,
    CustomerFavorite,
    MenuItem,
    Order,
    OrderItem,
    OrderStatusEvent,
    Message,
    DeliveryBooking,
    Story,
  ],
  migrations: [__dirname + '/../../migrations/user-db/*.{ts,js}'],
  synchronize: false,
  logging: false,
});
