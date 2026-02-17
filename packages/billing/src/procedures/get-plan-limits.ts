import { getBillingPlanLimits } from "../service"
import { protectedProcedure } from "./context"

export const getPlanLimits = protectedProcedure.handler(() => {
  return getBillingPlanLimits()
})
