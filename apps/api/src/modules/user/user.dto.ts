import { IsString, IsNotEmpty, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompensationPlanDto {
    @IsString()
    @IsNotEmpty()
    @IsEnum(['hourly_plus_back', 'commission_plus_back'])
    payType: string;

    @IsOptional()
    hourlyRate?: number;

    @IsOptional()
    commissionRate?: number;

    @IsOptional()
    inhouseUnit?: number;

    @IsOptional()
    drinkUnit?: number;

    @IsString()
    @IsNotEmpty()
    effectiveFrom: string;

    @IsOptional()
    @IsString()
    effectiveTo?: string;
}

export class CreateUserDto {
    @IsString()
    @IsNotEmpty({ message: 'displayName は必須です' })
    displayName: string;

    @IsString()
    @IsEnum(['cast', 'staff'], { message: 'userType は cast または staff で指定してください' })
    userType: string;

    @IsString()
    @IsEnum(['Cast', 'Staff', 'Manager', 'Admin'], {
        message: 'role は Cast / Staff / Manager / Admin のいずれかで指定してください',
    })
    role: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateCompensationPlanDto)
    compensationPlan?: CreateCompensationPlanDto;
}

export class UpdateUserStatusDto {
    @IsString()
    @IsEnum(['active', 'inactive'], { message: 'status は active または inactive で指定してください' })
    status: string;
}
