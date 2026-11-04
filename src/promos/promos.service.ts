import { BadRequestException, Injectable } from '@nestjs/common';
import { PromoCode, PromoType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ValidatePromoDto } from './dto/promo.dto';

export interface PromoEvaluationResult {
  valid: boolean;
  discount: number;
  reason?: string;
}

@Injectable()
export class PromosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public endpoint handler for POST /api/v1/promo/validate.
   * Validates the promo code and calculates the discount when subtotal is provided.
   */
  async validatePromo(dto: ValidatePromoDto) {
    const promo = await this.findAndValidateByCode(dto.code, dto.subtotal);

    const discount =
      dto.subtotal !== undefined
        ? this.calculateDiscount(promo, dto.subtotal)
        : null;

    return {
      valid: true,
      id: promo.id,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      minOrder: promo.minOrder,
      discount,
      expiresAt: promo.expiresAt,
    };
  }

  /**
   * Looks up a promo code by string and throws BadRequestException if invalid.
   * Used by POST /promo/validate and POST /cart/promo.
   */
  async findAndValidateByCode(
    rawCode: string,
    subtotal?: number,
  ): Promise<PromoCode> {
    const normalizedCode = rawCode.trim().toUpperCase();

    const promo = await this.prisma.promoCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!promo) {
      throw new BadRequestException('Invalid promo code');
    }

    const evaluation = this.evaluatePromo(promo, subtotal);
    if (!evaluation.valid) {
      throw new BadRequestException(evaluation.reason || 'Invalid promo code');
    }

    return promo;
  }

  /**
   * Non-throwing evaluation of a PromoCode against an optional cart subtotal.
   * Used during cart re-pricing so an existing cart never fails to load if a promo
   * later expires or the cart subtotal drops below minOrder.
   */
  evaluatePromo(promo: PromoCode, subtotal?: number): PromoEvaluationResult {
    if (!promo.isActive) {
      return {
        valid: false,
        discount: 0,
        reason: `Promo code "${promo.code}" is no longer active`,
      };
    }

    if (promo.expiresAt && promo.expiresAt.getTime() <= Date.now()) {
      return {
        valid: false,
        discount: 0,
        reason: `Promo code "${promo.code}" has expired`,
      };
    }

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return {
        valid: false,
        discount: 0,
        reason: `Promo code "${promo.code}" has reached its maximum usage limit`,
      };
    }

    if (subtotal !== undefined && subtotal < promo.minOrder) {
      const minNaira = (promo.minOrder / 100).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return {
        valid: false,
        discount: 0,
        reason: `Promo code "${promo.code}" requires a minimum order of ₦${minNaira}`,
      };
    }

    const discount =
      subtotal !== undefined ? this.calculateDiscount(promo, subtotal) : 0;

    return {
      valid: true,
      discount,
    };
  }

  /**
   * Calculates integer kobo discount, capped at the subtotal.
   */
  calculateDiscount(promo: PromoCode, subtotal: number): number {
    if (subtotal <= 0) {
      return 0;
    }

    if (promo.type === PromoType.PERCENT) {
      const raw = Math.floor((subtotal * promo.value) / 100);
      return Math.min(raw, subtotal);
    }

    return Math.min(promo.value, subtotal);
  }
}
