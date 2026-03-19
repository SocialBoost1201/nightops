import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateCompensationPlanDto {
    @IsString()
    @IsNotEmpty({ message: 'accountId は必須です' })
    accountId: string;

    @IsString()
    @IsEnum(['hourly_plus_back', 'commission_plus_back'], {
        message: 'payType は hourly_plus_back または commission_plus_back で指定してください',
    })
    payType: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    hourlyRate?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1, { message: 'commissionRate は 0.00〜1.00 の範囲で指定してください' })
    commissionRate?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    inhouseUnit?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    drinkUnit?: number;

    @IsString()
    @IsNotEmpty({ message: 'effectiveFrom は必須です' })
    effectiveFrom: string;

    @IsOptional()
    @IsString()
    effectiveTo?: string;
}
