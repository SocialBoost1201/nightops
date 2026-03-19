import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsInt,
    Min,
} from 'class-validator';

export class CreateCustomerDto {
    @IsString()
    @IsNotEmpty({ message: 'name は必須です' })
    name: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    memo?: string;
}

export class UpdateCustomerDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    memo?: string;
}
