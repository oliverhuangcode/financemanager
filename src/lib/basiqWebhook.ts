interface WebhookLinks {
  event?: string;
  eventEntity?: string;
}

/**
 * Basiq posts a flat body: { eventTypeId, eventId, links: { event, eventEntity } }.
 * Older docs/examples nest it under `payload`, so accept both shapes.
 */
export interface WebhookBody {
  eventTypeId?: string;
  eventId?: string;
  links?: WebhookLinks;
  payload?: {
    eventTypeId?: string;
    eventId?: string;
    links?: WebhookLinks;
  };
}

export function readEvent(body: WebhookBody): {
  eventTypeId: string | undefined;
  eventEntity: string | undefined;
} {
  return {
    eventTypeId: body.eventTypeId ?? body.payload?.eventTypeId,
    eventEntity: body.links?.eventEntity ?? body.payload?.links?.eventEntity,
  };
}
