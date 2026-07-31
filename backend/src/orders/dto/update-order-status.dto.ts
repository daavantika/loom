import { IsIn, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../order.entity';

const ORDER_STATUSES: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
