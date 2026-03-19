import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsDateString,
    IsArray,
    IsInt,
    IsNumber,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 売上明細行
 */
export class SalesLineDto {
    @IsString()
    @IsNotEmpty()
    itemCode: string;

    @IsString()
    @IsNotEmpty()
    itemName: string;

    @IsNumber()
    @Min(0)
    qty: number;

    @IsInt()
    @Min(0)
    unitPrice: number;
}

/**
 * ドリンク杯数（キャスト別）
 */
export class DrinkCountDto {
    @IsString()
    @IsNotEmpty()
    castId: string;

    @IsInt()
    @Min(0)
    cups: number;
}

/**
 * 売上伝票作成
 */
export class CreateSalesSlipDto {
    @IsDateString({}, { message: 'businessDate は YYYY-MM-DD 形式で入力してください' })
    businessDate: string;

    @IsOptional()
    @IsString()
    tableNo?: string;

    @IsOptional()
    @IsString()
    customerName?: string;

    @IsInt()
    @Min(1, { message: '人数は1以上で入力してください' })
    partySize: number;

    @IsString()
    @IsNotEmpty({ message: 'mainCastId は必須です' })
    mainCastId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SalesLineDto)
    lines: SalesLineDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DrinkCountDto)
    drinkCounts?: DrinkCountDto[];
}

/**
 * 売上伝票更新（締め前のみ）
 */
export class UpdateSalesSlipDto {
    @IsOptional()
    @IsString()
    tableNo?: string;

    @IsOptional()
    @IsString()
    customerName?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    partySize?: number;

    @IsOptional()
    @IsString()
    mainCastId?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SalesLineDto)
    lines?: SalesLineDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DrinkCountDto)
    drinkCounts?: DrinkCountDto[];
}
