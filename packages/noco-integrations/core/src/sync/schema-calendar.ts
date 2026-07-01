import { UITypes, TARGET_TABLES, TARGET_TABLES_META } from 'nocodb-sdk';
import { SyncSchema } from './types';

export const SCHEMA_CALENDAR: SyncSchema = {
  [TARGET_TABLES.CALENDAR_EVENT]: {
    title: TARGET_TABLES_META.calendar_event.label,
    columns: [
      { title: 'Title', uidt: UITypes.SingleLineText, pv: true },
      { title: 'Description', uidt: UITypes.LongText },
      { title: 'Start', uidt: UITypes.DateTime },
      { title: 'End', uidt: UITypes.DateTime },
      { title: 'All Day', uidt: UITypes.Checkbox },
      { title: 'Recurring Event', uidt: UITypes.Checkbox },
      { title: 'Location', uidt: UITypes.SingleLineText },
      {
        title: 'Status',
        uidt: UITypes.SingleSelect,
        colOptions: {
          options: [
            { title: 'confirmed' },
            { title: 'tentative' },
            { title: 'cancelled' },
          ],
        },
      },
      { title: 'Creator', uidt: UITypes.Email },
      { title: 'Organizer', uidt: UITypes.Email },
      { title: 'Attendees', uidt: UITypes.LongText },
      { title: 'Event URL', uidt: UITypes.URL },
      { title: 'Meeting Link', uidt: UITypes.URL },
      { title: 'Color', uidt: UITypes.SingleLineText },
      {
        title: 'Visibility',
        uidt: UITypes.SingleSelect,
        colOptions: {
          options: [
            { title: 'default' },
            { title: 'public' },
            { title: 'private' },
            { title: 'confidential' },
          ],
        },
      },
    ],
    relations: [],
  },
};
