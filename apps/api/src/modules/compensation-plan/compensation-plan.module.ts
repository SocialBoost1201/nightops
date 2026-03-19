import { Module } from '@nestjs/common';
import { CompensationPlanService } from './compensation-plan.service';
import { CompensationPlanController } from './compensation-plan.controller';

@Module({
    controllers: [CompensationPlanController],
    providers: [CompensationPlanService],
    exports: [CompensationPlanService],
})
export class CompensationPlanModule {}
