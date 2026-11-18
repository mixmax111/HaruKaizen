import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AiSandboxService } from './ai-sandbox.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy.js';
import {
  GenerateWorkoutPlanDto,
  GenerateDietPlanDto,
} from './dto/generate-plan.dto.js';

@Controller('ai')
export class AiSandboxController {
  constructor(private readonly sandboxService: AiSandboxService) {}

  @Post('generate-workout-plan')
  generateWorkoutPlan(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateWorkoutPlanDto,
  ) {
    return this.sandboxService.generateWorkoutPlan(user.sub, dto);
  }

  @Post('generate-diet-plan')
  generateDietPlan(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateDietPlanDto,
  ) {
    return this.sandboxService.generateDietPlan(user.sub, dto);
  }

  @Patch('workout-plans/:id/promote')
  promoteWorkoutPlan(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sandboxService.promoteWorkoutPlan(user.sub, id);
  }

  @Patch('diet-plans/:id/promote')
  promoteDietPlan(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sandboxService.promoteDietPlan(user.sub, id);
  }

  @Get('sandbox-drafts')
  findSandboxDrafts(@CurrentUser() user: JwtPayload) {
    return this.sandboxService.findSandboxDrafts(user.sub);
  }
}

