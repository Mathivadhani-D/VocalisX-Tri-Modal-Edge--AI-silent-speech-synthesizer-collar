VocalisX dashboard (static, no build step)

VS Code: File > Open Folder > this folder, then right-click index.html > Open with Live Server
(install the "Live Server" extension), or just double-click index.html.

Files: index.html (markup), styles.css (theme and layout), app.js (translations, pages, logic),
       analysis.js (Data Analysis page: statistics, EDA and figures fetched from the Python backend).
Pages (hash routes): #home #recognition #phrases #contacts #analysis #settings #history
Collar data is simulated. Replace connect() in app.js with your Web Bluetooth or WebSocket feed.
Phrases, contacts, history and settings are saved in the browser's localStorage.

The Analysis page needs the backend:  cd ../vocalisx_backend && uvicorn main:app --reload
(or open http://127.0.0.1:8000/app/ which serves this dashboard from the same server).
