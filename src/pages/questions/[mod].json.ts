import type { APIRoute, GetStaticPaths } from 'astro'

import { serveBank } from '../../lib/bank.server.ts'
import { MODULES } from '../../lib/constants.ts'
import type { ModuleId } from '../../lib/types.ts'

export const getStaticPaths = (() => {
  return MODULES.map((m) => ({ params: { mod: m.id } }))
}) satisfies GetStaticPaths

export const GET: APIRoute = async ({ params }) => {
  const bank = await serveBank(params.mod as ModuleId)
  return Response.json(bank)
}
