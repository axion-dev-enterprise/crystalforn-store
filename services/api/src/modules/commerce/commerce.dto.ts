import { Type } from 'class-transformer';
import { Equals, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from 'class-validator';

export class OrderHistoryQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}

export class CreateOrderDto {
  @IsUUID() productId!: string;
  @IsBoolean() @Equals(true) termsAccepted!: true;
  @IsIn(['pix','wallet']) paymentMethod!: 'pix' | 'wallet';
  @IsOptional() @IsIn(['mercadopago','pushinpay']) gateway?: 'mercadopago' | 'pushinpay';
  @IsOptional() @IsString() @Length(3, 32) @Matches(/^[A-Za-z0-9_-]+$/) couponCode?: string;
}

export class WalletTopupDto {
  @IsString() @Length(1, 6) @Matches(/^[0-9]+$/) amountCents!: string;
}

export class CancellationRequestDto {
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
}

export class CancellationRequestReviewDto {
  @IsIn(['open', 'under_review', 'resolved', 'declined']) status!: 'open' | 'under_review' | 'resolved' | 'declined';
  @IsOptional() @IsString() @MaxLength(1000) adminResponse?: string;
}
