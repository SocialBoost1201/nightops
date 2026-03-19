import { Module } from '@nestjs/common';
import { ChangeRequestService } from './change-request.service';
import { ChangeRequestController } from './change-request.controller';

@Module({
    controllers: [ChangeRequestController],
    providers: [ChangeRequestService],
    exports: [ChangeRequestService],
})
export class ChangeRequestModule {}
