import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class OrderItemInputDto {
  @IsUUID()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsUUID()
  cookId!: string;

  @IsUUID()
  addressId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  // Defaults to 'COD' in the service when omitted — fully backward compatible.
  @IsOptional()
  @IsIn(['COD', 'ONLINE'])
  paymentMethod?: 'COD' | 'ONLINE';
}
