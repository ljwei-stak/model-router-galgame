export const latencyFor = (decision, random = 0.5) => Number(decision.latency || decision.model?.avgLatency || .7) * (.9 + random * .2)

