# testwebsocket
testwebsocket
https://github.com/heroku-examples/node-socket.io
https://socket.io/docs/server-api/
https://socket.io/docs/client-api/

Securing the domin
https://stackoverflow.com/questions/39420992/securing-a-socket-io-websocket-and-restricting-it-to-a-domain

heroku notes
https://devcenter.heroku.com/articles/deploying-nodejs
https://devcenter.heroku.com/articles/getting-started-with-nodejs#deploy-the-app

login
heroku login

Launch locally on port 5000.
heroku local web

https://devcenter.heroku.com/articles/logging
heroku logs --tail

pushing changes (this forces a rebuild and seems to resolve the server in maintaince mode as it does a whole new build.)
git push heroku master

start up instance
heroku ps:scale web=1
Take it down
heroku ps:scale web=0

Turn off maintaince mode.
heroku maintenance:off