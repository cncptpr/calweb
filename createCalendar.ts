import { DAVClient } from 'tsdav';
import dotenv from 'dotenv';
dotenv.config();

const {
  CALDAV_URL,
  CALDAV_USERNAME,
  CALDAV_PASSWORD,
  CALENDAR_NAME
} = process.env;

if (!CALDAV_URL || !CALDAV_USERNAME || !CALDAV_PASSWORD || !CALENDAR_NAME) {
  console.error('Missing required environment variables (CALDAV_URL, CALDAV_USERNAME, CALDAV_PASSWORD, CALENDAR_NAME).');
  process.exit(1);
}

(async () => {
  const client = new DAVClient({
    serverUrl: CALDAV_URL,
    credentials: {
      username: CALDAV_USERNAME,
      password: CALDAV_PASSWORD,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });
  await client.login();

  // Calendar collection URL: root + calendar name
  const calendarUrl = CALDAV_URL.endsWith('/')
    ? `${CALDAV_URL}${encodeURIComponent(CALENDAR_NAME)}/`
    : `${CALDAV_URL}/${encodeURIComponent(CALENDAR_NAME)}/`;

  const mkcalendarXml = `<?xml version="1.0" encoding="utf-8" ?>
  <C:mkcalendar xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
    <D:set>
      <D:prop>
        <D:displayname>${CALENDAR_NAME}</D:displayname>
        <C:supported-calendar-component-set>
          <C:comp name="VTODO"/>
          <C:comp name="VEVENT"/>
        </C:supported-calendar-component-set>
        <C:calendar-description xml:lang="en">Created by calweb script</C:calendar-description>
        <C:calendar-timezone>UTC</C:calendar-timezone>
      </D:prop>
    </D:set>
  </C:mkcalendar>`;
  try {
    await client.davRequest({
      url: calendarUrl,
      init: {
        method: 'MKCALENDAR',
        headers: {
          'Accept': 'application/xml',
          'Content-Type': 'application/xml; charset=utf-8',
        },
        body: mkcalendarXml
      }
    });
    console.log('Calendar created at:', calendarUrl);
  } catch (err: any) {
    if (err?.response?.status === 405) {
      console.error('Calendar already exists at:', calendarUrl);
    } else {
      console.error('Failed to create calendar:', err);
    }
    process.exit(2);
  }
})();
