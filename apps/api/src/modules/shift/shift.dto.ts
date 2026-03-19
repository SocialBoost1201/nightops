import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    ValidateNested,
    IsDateString,
    IsEnum,
    Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * シフト1日分の入力
 */
export class ShiftDayDto {
    @IsDateString({}, { message: 'date は YYYY-MM-DD 形式で入力してください' })
    date: string;

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/, { message: 'plannedStart は HH:MM 形式で入力してください' })
    plannedStart?: string;

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/, { message: 'plannedEnd は HH:MM 形式で入力してください' })
    plannedEnd?: string;

    @IsOptional()
    @IsString()
    memo?: string;
}

/**
 * シフト2週間分の一括提出
 */
export class SubmitShiftsDto {
    @IsDateString({}, { message: 'periodStart は YYYY-MM-DD 形式で入力してください' })
    periodStart: string;

    @IsDateString({}, { message: 'periodEnd は YYYY-MM-DD 形式で入力してください' })
    periodEnd: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ShiftDayDto)
    entries: ShiftDayDto[];
}

/**
 * シフト承認/差戻（一括）
 */
export class ApproveShiftsDto {
    @IsArray()
    @IsString({ each: true })
    shiftIds: string[];

    @IsString()
    @IsEnum(['approved', 'rejected'], {
        message: 'action は approved または rejected で指定してください',
    })
    action: string;
}

/**
 * シフト変更申請
 */
export class ShiftChangeRequestDto {
    @IsString()
    @IsNotEmpty({ message: 'shiftId は必須です' })
    shiftId: string;

    @IsString()
    @IsNotEmpty({ message: 'reason は必須です' })
    reason: string;

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/, { message: 'newPlannedStart は HH:MM 形式で入力してください' })
    newPlannedStart?: string;

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/, { message: 'newPlannedEnd は HH:MM 形式で入力してください' })
    newPlannedEnd?: string;

    @IsOptional()
    @IsString()
    newMemo?: string;
}
