import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, Matches } from 'class-validator';

export class AdminOrdersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
}

export class AdminCatalogQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(['fortnite','valorant','lol','roblox','steam','other']) game?: string;
  @IsOptional() @Matches(/^[0-9]{1,40}$/) sellerId?: string;
  @IsOptional() @IsIn(['available','invalid','banned','sold','hidden']) status?: string;
  @IsOptional() @IsIn(['all','visible','hidden']) visibility: 'all' | 'visible' | 'hidden' = 'all';
  @IsOptional() @IsIn(['all','needs_review']) quality: 'all' | 'needs_review' = 'all';
  @IsOptional() @IsIn(['all','stale','fresh']) freshness: 'all' | 'stale' | 'fresh' = 'all';
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(90071992547409.91) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(90071992547409.91) maxPrice?: number;
}

export class AdminPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(['all','complete','failed','running']) status?: string;
  @IsOptional() @IsString() @MaxLength(80) action?: string;
}

export class PricingPreviewQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(50) @Max(59) markupPercent = 55;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(4) couponPercent?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) sampleSize = 10;
}

export class VisibilityDto {
  @IsBoolean() hidden!: boolean;
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
