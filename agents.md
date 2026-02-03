This is a tanstack start project using tailwind.

You task is to make this project a TODO service for a given CalDav Server. 

The frontend should be a mobile friendly website, to mainly view and check the todos. It should have some editing capability too.

The backend will hold the credentials to the CalDav server.
Everyone using this app should see the same TODOs.
This means fast syncing is very important. 
The server will act as a Proxy for the CalDav server. Enabling realtime live sync over websocket, while keeping the CalDav server up to date.

For now, there is no login required.

Regularly run `npm run check` and fix all typescript errors.
Tailwind is setup, use it.

Completed todos should always be shown, but appear at the end of the list, and be displayed with a strike-through title.
