import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, Matches } from 'class-validator';

export class AdminOrdersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
}

export class StoreSettingsDto {
  @IsInt() @Min(50) @Max(59) markupPercent!: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 6 }) @Min(0.000001) usdBrlRate?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 6 }) @Min(0.000001) rubBrlRate?: number;
  @IsArray() @ArrayMaxSize(500) @Matches(/^[0-9]{1,40}$/, { each: true }) blockedSellerIds!: string[];
}

export class CouponDto {
  @IsString() @MaxLength(32) @Matches(/^[A-Za-z0-9_-]{3,32}$/) code!: string;
  @IsInt() @Min(1) @Max(4) discountPercent!: number;
  @IsOptional() @IsInt() @Min(1) maxRedemptions?: number;
}

export class DeliveryDto {
  @IsString() @MaxLength(10000) credentials!: string;
}

export class CouponActiveDto {
  @IsBoolean() active!: boolean;
}
