import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import type { StoreCatalogGame } from './catalog.mapper';

export class CatalogQueryDto {
  @IsOptional() @IsIn(['fortnite','valorant','roblox','steam']) game?: StoreCatalogGame;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(48) pageSize = 24;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) minDaysOffline?: number;
}
