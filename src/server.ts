import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import querystring from 'querystring';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import request from 'request';
import path from 'path';
import axios from 'axios';
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 8888;

const client_id = process.env.cliend_id; // Your client id
const client_secret = process.env.client_secret; // Your secret
const redirect_uri = process.env.redirect_uri; // Your redirect uri
let stateKey = 'spotify_auth_state';

// app.get('/', (req: Request, res: Response) => {
//   res.send('Welcome to spotify :)');
// });
app.use('/favicon.ico', express.static('public/favicon.ico'));
app.get('/', function (req: Request, res: Response) {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
// var options = {
//   dotfiles: 'ignore',
//   etag: false,
//   extensions: ['htm', 'html'],
//   index: false,
//   maxAge: '1d',
//   redirect: false,
//   setHeaders: function (res: Response) {
//     res.set('x-timestamp', `${Date.now()}`);
//   },
// };
// app
//   .use('/', express.static('public/index.html'))
//   .use(cors())
//   .use(cookieParser());

app.get('/login', function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope =
    'user-read-private user-read-email user-read-playback-state user-read-currently-playing user-modify-playback-state';
  res.redirect(
    'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
      })
  );
});

var generateRandomString = function (length: number) {
  var text = '';
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

app.get('/callback', function (req: Request, res: Response) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  // if (state === null || state !== storedState) {
  //   res.redirect(
  //     '/#' +
  //       querystring.stringify({
  //         error: 'state_mismatch',
  //       })
  //   );
  // } else {
  // res.clearCookie(stateKey);
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code',
    },
    headers: {
      Authorization:
        'Basic ' +
        new Buffer(client_id + ':' + client_secret).toString('base64'),
    },
    json: true,
  };
  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
        refresh_token = body.refresh_token;

      var options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { Authorization: 'Bearer ' + access_token },
        json: true,
      };

      // use the access token to access the Spotify Web API
      request.get(options, function (error, response, body) {
        console.log(body);
      });

      // we can also pass the token to the browser to make requests from there
      res.redirect(
        '/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token,
          })
      );
    } else {
      res.redirect(
        '/#' +
          querystring.stringify({
            error: 'invalid_token',
          })
      );
    }
  });
  // }
});

app.get('/refresh_token', function (req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization:
        'Basic ' +
        new Buffer(client_id + ':' + client_secret).toString('base64'),
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token,
      });
    }
  });
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
