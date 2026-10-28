import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { StoreCatalogGame } from './catalog.mapper';

export class CatalogQueryDto {
  @IsOptional() @IsIn(['fortnite','valorant','lol','roblox','steam']) game?: StoreCatalogGame;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(48) pageSize = 24;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) minDaysOffline?: number;
  @IsOptional() @IsString() @MaxLength(100) skinName?: string;
  @IsOptional() @IsString() @MaxLength(100) steamGame?: string;
  @IsOptional() @IsString() @MaxLength(40) rank?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) minLevel?: number;
}
