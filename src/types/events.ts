// types/events.ts
export type EventType = 
  | 'PARCEL_STATUS_UPDATED'
  | 'USER_CREATED'
  | 'PASSWORD_RESET'
  | 'ORDER_CREATED';

export interface BaseEvent {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  payload: any;
}

export interface OrderEvent extends BaseEvent {
  eventType: 'PARCEL_STATUS_UPDATED' | 'ORDER_CREATED';
  payload: {
    orderId: string;
    status: string;
    userId: string;
    // autres champs spécifiques aux commandes
  };
}

export interface UserEvent extends BaseEvent {
  eventType: 'USER_CREATED' | 'PASSWORD_RESET';
  payload: {
    userId: string;
    // champs spécifiques aux utilisateurs
    resetLink?: string;
  };
}