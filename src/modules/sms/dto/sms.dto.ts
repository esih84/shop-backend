import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SmsEvent } from '../entities/sms-template.entity';
import { OrderStatus } from '../../orders/entities/order.entity';
import { CustomerFilterDto } from '../../crm/dto/customer-filter.dto';

export class CreateSmsTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ description: 'متن با placeholder: {name} {pet} {orderNumber} {status} {amount}' })
  @IsString() @IsNotEmpty() body: string;
  @ApiProperty({ enum: SmsEvent }) @IsEnum(SmsEvent) event: SmsEvent;
  @ApiPropertyOptional({ enum: OrderStatus, description: 'برای event=order_status' })
  @IsOptional() @IsEnum(OrderStatus) orderStatus?: OrderStatus;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSmsTemplateDto extends PartialType(CreateSmsTemplateDto) {}

export class SendTestSmsDto {
  @ApiProperty() @IsString() @IsNotEmpty() templateId: string;
  @ApiProperty() @IsString() @IsNotEmpty() phone: string;
}

export class CreateCampaignDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ description: 'متن با {name}/{pet}' })
  @IsString() @IsNotEmpty() body: string;
  @ApiPropertyOptional({ type: CustomerFilterDto })
  @IsOptional() @ValidateNested() @Type(() => CustomerFilterDto)
  filters?: CustomerFilterDto;
}

export class PreviewCampaignDto {
  @ApiPropertyOptional({ type: CustomerFilterDto })
  @IsOptional() @ValidateNested() @Type(() => CustomerFilterDto)
  filters?: CustomerFilterDto;
}
