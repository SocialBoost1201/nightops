import {
    IsString,
    IsNotEmpty,
    IsEnum,
} from 'class-validator';

export class ProcessChangeRequestDto {
    @IsString()
    @IsEnum(['approved', 'rejected'], { message: 'action は approved または rejected で指定してください' })
    action: string;
}
