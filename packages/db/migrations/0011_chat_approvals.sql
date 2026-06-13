-- 0011_chat_approvals.sql — tarjetas de aprobación en el chat (C3 + HITL).
--
-- Permite que saxa entregue una aprobación pendiente (p. ej. el submit del
-- TM47 con su captura) como un mensaje de chat enriquecido. El móvil lo
-- renderiza como tarjeta con imagen + botones Aprobar/Rechazar; al pulsar,
-- el cliente envía un mensaje normal ('/aprobar <id>') que saxa procesa.
-- Así no hace falta exponer el schema `agent` a los clientes.

alter table chat.messages
  add column if not exists metadata jsonb;

comment on column chat.messages.metadata is
  'Opcional. Para tarjetas de aprobación: {kind:"approval", approval_id, action_kind, image_url}.';
