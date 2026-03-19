import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty({ message: 'loginId は必須です' })
    loginId: string;

    @IsString()
    @IsNotEmpty({ message: 'password は必須です' })
    password: string;
}

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty({ message: '現在のパスワードは必須です' })
    currentPassword: string;

    @IsString()
    @MinLength(8, { message: '新しいパスワードは8文字以上で入力してください' })
    @IsNotEmpty({ message: '新しいパスワードは必須です' })
    newPassword: string;
}

export class RefreshTokenDto {
    @IsString()
    @IsNotEmpty({ message: 'refreshToken は必須です' })
    refreshToken: string;
}
