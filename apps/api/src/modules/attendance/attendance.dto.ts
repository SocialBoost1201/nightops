import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsDateString,
    IsArray,
    Matches,
    IsBoolean,
} from 'class-validator';

/**
 * 出勤打刻（Cast / Staff）
 */
export class CheckinDto {
    @IsOptional()
    @IsString()
    timestamp?: string; // ISO 8601。省略時はサーバー時刻
}

/**
 * 退勤打刻（Staff のみ）
 */
export class CheckoutDto {
    @IsOptional()
    @IsString()
    timestamp?: string;
}

/**
 * キャストあがり入力（Manager / Admin）
 */
export class CastCheckoutDto {
    @IsString()
    @IsNotEmpty({ message: 'accountId は必須です' })
    accountId: string;

    @IsDateString({}, { message: 'businessDate は YYYY-MM-DD 形式で入力してください' })
    businessDate: string;

    @Matches(/^\d{2}:\d{2}$/, { message: 'checkoutTime は HH:MM 形式で入力してください' })
    checkoutTime: string;
}

/**
 * 日次締め実行（Manager / Admin）
 */
export class DailyCloseDto {
    @IsDateString({}, { message: 'businessDate は YYYY-MM-DD 形式で入力してください' })
    businessDate: string;

    @IsOptional()
    @IsBoolean()
    forceClose?: boolean; // 未入力警告を無視して強制締め
}
