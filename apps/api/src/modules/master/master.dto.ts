import {
    IsString,
    IsInt,
    IsNumber,
    IsOptional,
    Min,
    Max,
} from 'class-validator';

export class UpdateStoreSettingsDto {
    @IsOptional()
    @IsString()
    storeCode?: string;

    @IsOptional()
    @IsNumber()
    @Min(1.0)
    @Max(2.0)
    serviceTaxMultiplier?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    roundingUnit?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    roundingThreshold?: number;
}
