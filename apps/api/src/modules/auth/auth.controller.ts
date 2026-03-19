import {
    Controller,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto, RefreshTokenDto } from './auth.dto';
import { JwtAuthGuard, CurrentUser, RequestUser } from '../../common';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * POST /api/auth/login
     * レートリミット: 60秒間に10回まで（ブルートフォース対策）
     */
    @Post('login')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.loginId, dto.password);
    }

    /**
     * POST /api/auth/change-password
     * JWT認証済みユーザーのみ
     */
    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @CurrentUser() user: RequestUser,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(
            user.id,
            dto.currentPassword,
            dto.newPassword,
        );
    }

    /**
     * POST /api/auth/refresh
     * レートリミット: 60秒間に20回まで
     */
    @Post('refresh')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshToken(dto.refreshToken);
    }

    /**
     * POST /api/auth/logout
     * リフレッシュトークンをサーバー側で無効化（任意実装）
     * 現状はクライアント側del Cookieのみでも成立するが、
     * トークンブラックリスト実装時のフックポイントとして用意
     */
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@CurrentUser() user: RequestUser) {
        // 将来: RefreshToken ブラックリストへの追加
        // 現状: 204 を返すのみ（クライアント側でCookieを削除）
        return { loggedOut: true, userId: user.id };
    }
}
