import { splitCardBody, type Card, type CardDTO, type CardSummary } from "@engram/shared";
import { isLeech } from "../scheduler/leech.ts";

export function toCardDTO(card: Card): CardDTO {
  const parts = splitCardBody(card.body);
  return {
    id: card.id,
    front: parts?.front ?? "",
    back: parts?.back ?? "",
    box: card.box,
    due: card.due,
    lapses: card.lapses,
    created: card.created,
    source: card.source,
    type: card.type,
    leech: isLeech(card),
  };
}

export function toCardSummary(card: Card): CardSummary {
  return {
    id: card.id,
    box: card.box,
    due: card.due,
    lapses: card.lapses,
    created: card.created,
    source: card.source,
    type: card.type,
    leech: isLeech(card),
  };
}
